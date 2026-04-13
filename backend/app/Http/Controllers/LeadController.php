<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\WelcomeLeadMail;
use App\Models\User;
use Carbon\Carbon;

class LeadController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = \App\Models\Lead::with(['course', 'advisor', 'interactions' => function($q) {
            $q->latest()->take(1); // just the last interaction for list views
        }]);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            $query->where('advisor_id', $request->user()->id);
        }

        if ($request->has('advisor_id')) {
            $query->where('advisor_id', $request->advisor_id);
        }

        if ($request->has('period')) {
            $period = $request->period;
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfMonth();

            switch ($period) {
                case 'mes_pasado':
                    $startDate = Carbon::now()->subMonth()->startOfMonth();
                    $endDate = Carbon::now()->subMonth()->endOfMonth();
                    break;
                case 'trimestre':
                    $startDate = Carbon::now()->startOfQuarter();
                    $endDate = Carbon::now()->endOfQuarter();
                    break;
                case 'anio':
                    $startDate = Carbon::now()->startOfYear();
                    $endDate = Carbon::now()->endOfYear();
                    break;
            }
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('created_at', [
                Carbon::parse($request->start_date)->startOfDay(),
                Carbon::parse($request->end_date)->endOfDay()
            ]);
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search !== '') {
            $searchTerm = '%' . $request->search . '%';
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', $searchTerm)
                  ->orWhere('email', 'like', $searchTerm)
                  ->orWhere('phone', 'like', $searchTerm)
                  ->orWhere('student_id', 'like', $searchTerm);
            });
        }

        // Kanban needs all leads usually, or maybe paginated if many
        if ($request->has('kanban')) {
            return response()->json(['data' => $query->latest()->get()]);
        }

        return $query->latest()->paginate($request->input('per_page', 15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email',
            'city' => 'nullable|string',
            'id_number' => 'nullable|string',
            'profession' => 'nullable|string',
            'country' => 'nullable|string',
            'course_interest_id' => 'nullable|exists:courses,id',
            'advisor_id' => 'nullable|exists:users,id',
            'source' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if (empty($validated['advisor_id']) || (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe'))) {
            $validated['advisor_id'] = $request->user()->id;
        }

        $lead = \App\Models\Lead::create($validated);

        if (!empty($lead->email)) {
            $advisor = User::find($lead->advisor_id);
            if ($advisor) {
                Mail::to($lead->email)->queue(new WelcomeLeadMail($lead, $advisor));
            }
        }

        return response()->json(['message' => 'Lead created successfully', 'data' => $lead], 201);
    }

    public function show(Request $request, $id)
    {
        $lead = \App\Models\Lead::with(['course', 'advisor', 'interactions.user', 'enrollment'])->findOrFail($id);
        
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && $lead->advisor_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }
        
        return response()->json(['data' => $lead]);
    }

    public function update(Request $request, $id)
    {
        $lead = \App\Models\Lead::findOrFail($id);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && $lead->advisor_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:50',
            'email' => 'nullable|email',
            'city' => 'nullable|string',
            'id_number' => 'nullable|string',
            'profession' => 'nullable|string',
            'country' => 'nullable|string',
            'course_interest_id' => 'nullable|exists:courses,id',
            'advisor_id' => 'nullable|exists:users,id',
            'source' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            unset($validated['advisor_id']);
        }

        // PROTECTION: Leads cannot return to 'new' once they've left it
        if (isset($validated['status']) && $lead->status !== 'new' && $validated['status'] === 'new') {
            return response()->json(['message' => 'No se puede regresar un contacto a la fase Nuevo.'], 422);
        }

        $lead->update($validated);
        return response()->json(['message' => 'Lead updated successfully', 'data' => $lead]);
    }

    public function updateStatus(Request $request, $id)
    {
        $lead = \App\Models\Lead::findOrFail($id);
        
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && $lead->advisor_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }
        
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        // PROTECTION: Leads cannot return to 'new' once they've left it
        if ($lead->status !== 'new' && $validated['status'] === 'new') {
            return response()->json(['message' => 'No se puede regresar un contacto a la fase Nuevo una vez que ha sido procesado.'], 422);
        }

        $lead->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Lead status updated successfully', 'data' => $lead]);
    }

    public function addInteraction(Request $request, $id)
    {
        $lead = \App\Models\Lead::findOrFail($id);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && $lead->advisor_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|string', // call, whatsapp, email, meeting
            'result' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $interaction = \App\Models\LeadInteraction::create([
            'lead_id' => $lead->id,
            'user_id' => $request->user()->id,
            'type' => $validated['type'],
            'result' => $validated['result'],
            'notes' => $validated['notes'],
            'interacted_at' => now(),
        ]);

        // AUTOMATIC TRANSITION: If lead was 'new', move to 'contacted'
        if ($lead->status === 'new') {
            $lead->update(['status' => 'contacted']);
        }

        return response()->json(['message' => 'Interaction added successfully', 'data' => $interaction->load('user')], 201);
    }

    public function destroy(Request $request, $id)
    {
        $lead = \App\Models\Lead::findOrFail($id);
        
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && $lead->advisor_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }
        
        $lead->delete();
        return response()->json(['message' => 'Lead deleted successfully']);
    }

    public function stats(Request $request)
    {
        $query = \App\Models\Lead::query();
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            $query->where('advisor_id', $request->user()->id);
        }

        $total = (clone $query)->count();
        $byStatus = (clone $query)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');
            
        return response()->json([
            'total' => $total,
            'by_status' => $byStatus,
        ]);
    }

    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="plantilla_importacion_leads.csv"',
        ];

        $callback = function () {
            $file = fopen('php://output', 'w');
            
            // Add BOM for proper UTF-8 Excel reading
            fputs($file, "\xEF\xBB\xBF");
            
            // Header row
            fputcsv($file, ['name', 'phone', 'email', 'city', 'id_number', 'profession', 'country', 'course_interest_id'], ';');
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls',
            'advisors' => 'nullable|array', // e.g. [3, 4, 7]
            'advisors.*' => 'exists:users,id'
        ]);

        $file = $request->file('file');
        
        // Simple CSV parser for demonstration, you might use Maatwebsite/Excel for complex files
        $fileHandle = fopen($file->getRealPath(), 'r');
        
        // Detect separator
        $firstLine = fgets($fileHandle);
        $separator = strpos($firstLine, ';') !== false ? ';' : ',';
        
        // Rewind and skip BOM if present
        rewind($fileHandle);
        $bom = fread($fileHandle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($fileHandle);
        }

        // Read the actual header
        $header = fgetcsv($fileHandle, 1000, $separator);

        if (!$header) {
            return response()->json(['message' => 'Archivo inválido o vacío'], 400);
        }

        // Map headers to lowercase to match logic
        $header = array_map('trim', $header);
        $headerLine = array_map('strtolower', $header);

        $nameIndex = array_search('name', $headerLine);
        $phoneIndex = array_search('phone', $headerLine);
        $emailIndex = array_search('email', $headerLine);
        $cityIndex = array_search('city', $headerLine);
        $idIndex = array_search('id_number', $headerLine);
        $professionIndex = array_search('profession', $headerLine);
        $countryIndex = array_search('country', $headerLine);
        $courseIndex = array_search('course_interest_id', $headerLine);

        if ($nameIndex === false || $phoneIndex === false) {
            return response()->json(['message' => 'El archivo debe contener al menos las columnas "name" y "phone"'], 400);
        }

        $advisors = $request->input('advisors', []);
        $globalCourseId = $request->input('course_id'); // Curso seleccionado globalmente en la UI
        
        // If no advisors sent, we can fall back to the currently authenticated user
        if (empty($advisors)) {
            $advisors = [$request->user()->id];
        }

        $imported = 0;
        $duplicates = 0;
        $advisorIndex = 0;
        $numAdvisors = count($advisors);

        while (($row = fgetcsv($fileHandle, 1000, $separator)) !== false) {
            // skip empty rows
            if (!isset($row[$nameIndex]) || trim($row[$nameIndex]) === '') {
                continue;
            }

            $email = $emailIndex !== false && isset($row[$emailIndex]) ? trim($row[$emailIndex]) : null;
            $phone = trim($row[$phoneIndex]);

            // Check duplicate by phone or email
            $exists = \App\Models\Lead::where('phone', $phone)
                ->when($email, function ($q) use ($email) {
                    $q->orWhere('email', $email);
                })
                ->exists();

            if ($exists) {
                $duplicates++;
                continue;
            }

            // Assign via Round Robin
            $assignedTo = $advisors[$advisorIndex];
            $advisorIndex = ($advisorIndex + 1) % $numAdvisors;

            $lead = \App\Models\Lead::create([
                'name' => trim($row[$nameIndex]),
                'phone' => $phone,
                'email' => $email,
                'city' => $cityIndex !== false && isset($row[$cityIndex]) && trim($row[$cityIndex]) !== '' ? trim($row[$cityIndex]) : null,
                'id_number' => $idIndex !== false && isset($row[$idIndex]) && trim($row[$idIndex]) !== '' ? trim($row[$idIndex]) : null,
                'profession' => $professionIndex !== false && isset($row[$professionIndex]) && trim($row[$professionIndex]) !== '' ? trim($row[$professionIndex]) : null,
                'country' => $countryIndex !== false && isset($row[$countryIndex]) && trim($row[$countryIndex]) !== '' ? trim($row[$countryIndex]) : null,
                'course_interest_id' => ($courseIndex !== false && isset($row[$courseIndex]) && is_numeric(trim($row[$courseIndex])))
                    ? trim($row[$courseIndex])
                    : ($globalCourseId ?: null),
                'advisor_id' => $assignedTo,
                'source' => 'import',
                'status' => 'new',
            ]);

            \App\Models\LeadInteraction::create([
                'lead_id' => $lead->id,
                'user_id' => $request->user()->id,
                'type' => 'email', // Default system generated
                'result' => 'no_response',
                'notes' => 'Lead importado desde archivo CSV/Excel.',
                'interacted_at' => now()
            ]);

            if (!empty($lead->email)) {
                $advisorObj = User::find($assignedTo);
                if ($advisorObj) {
                    Mail::to($lead->email)->queue(new WelcomeLeadMail($lead, $advisorObj));
                }
            }

            $imported++;
        }

        fclose($fileHandle);

        return response()->json([
            'message' => 'Importación completada',
            'imported' => $imported,
            'duplicates' => $duplicates,
            'advisors_used' => $numAdvisors
        ]);
    }
}
