<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;
use App\Models\LeadOpportunity;
use App\Models\LeadInteraction;
use App\Models\User;
use App\Models\EnrollmentForm;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class SalesDashboardController extends Controller
{
    // ── Helpers ──────────────────────────────────────────────────────────────
    private function resolveDateRange(Request $request): array
    {
        $period    = $request->input('period', 'este_mes');
        $startDate = Carbon::now()->startOfMonth();
        $endDate   = Carbon::now()->endOfMonth();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            return [
                Carbon::parse($request->input('start_date'))->startOfDay(),
                Carbon::parse($request->input('end_date'))->endOfDay(),
            ];
        }

        switch ($period) {
            case 'mes_pasado':
                $startDate = Carbon::now()->subMonth()->startOfMonth();
                $endDate   = Carbon::now()->subMonth()->endOfMonth();
                break;
            case 'trimestre':
                $startDate = Carbon::now()->startOfQuarter();
                $endDate   = Carbon::now()->endOfQuarter();
                break;
            case 'anio':
                $startDate = Carbon::now()->startOfYear();
                $endDate   = Carbon::now()->endOfYear();
                break;
        }

        return [$startDate, $endDate];
    }

    // ── KPI Summary ───────────────────────────────────────────────────────────
    public function index(Request $request)
    {
        $user = $request->user();

        $advisorIds = [];
        if ($user->hasRole('admin') || $user->hasRole('jefe')) {
            $advisorIds = User::whereHas('roles', fn($q) => $q->where('name', 'asesor_academico'))
                ->pluck('id')->toArray();
        }

        [$startDate, $endDate] = $this->resolveDateRange($request);

        $totalLeads = Lead::whereIn('advisor_id', $advisorIds)
            ->whereBetween('created_at', [$startDate, $endDate])->count();

        $wonLeads = Lead::whereIn('advisor_id', $advisorIds)
            ->where('status', 'closed_won')
            ->whereBetween('updated_at', [$startDate, $endDate])->count();

        $conversionRate = $totalLeads > 0 ? ($wonLeads / $totalLeads) * 100 : 0;

        $cacheKey       = "avg_response_time_{$request->input('period','este_mes')}_" . implode(',', $advisorIds);
        $avgResponseTime = Cache::remember($cacheKey, 3600, function () use ($startDate, $endDate, $advisorIds) {
            return DB::table('leads')
                ->join('lead_interactions', 'leads.id', '=', 'lead_interactions.lead_id')
                ->select(DB::raw('AVG(EXTRACT(EPOCH FROM (lead_interactions.created_at - leads.created_at))) as avg_seconds'))
                ->whereIn('leads.advisor_id', $advisorIds)
                ->whereBetween('leads.created_at', [$startDate, $endDate])
                ->whereIn('lead_interactions.id', function ($query) {
                    $query->select(DB::raw('MIN(id)'))->from('lead_interactions')->groupBy('lead_id');
                })->value('avg_seconds');
        });

        $advisorPerformance = User::whereIn('id', $advisorIds)
            ->withCount(['leads as total_leads' => fn($q) => $q->whereBetween('created_at', [$startDate, $endDate])])
            ->withCount(['leads as won_leads' => fn($q) => $q->where('status', 'closed_won')->whereBetween('updated_at', [$startDate, $endDate])])
            ->get()
            ->map(fn($a) => [
                'id'         => $a->id,
                'name'       => $a->name,
                'total'      => $a->total_leads,
                'won'        => $a->won_leads,
                'conversion' => $a->total_leads > 0 ? round(($a->won_leads / $a->total_leads) * 100, 2) : 0,
                'target'     => 20,
            ]);

        $pipelineValue = LeadOpportunity::whereHas('lead', fn($q) => $q->whereIn('advisor_id', $advisorIds))
            ->whereIn('status', ['open', 'negotiating'])
            ->sum(DB::raw('estimated_value * (probability / 100)')) ?? 0;

        return response()->json([
            'conversion_rate'          => round($conversionRate, 2),
            'avg_response_time_minutes'=> round(($avgResponseTime ?? 0) / 60, 2),
            'pipeline_value'           => (float) $pipelineValue,
            'advisor_performance'      => $advisorPerformance,
            'leads_by_source'          => Lead::whereIn('advisor_id', $advisorIds)
                ->select('source', DB::raw('count(*) as count'))->groupBy('source')->get(),
        ]);
    }

    // ── Approve opportunity ───────────────────────────────────────────────────
    public function approveOpportunity(Request $request, $id)
    {
        $opportunity = LeadOpportunity::findOrFail($id);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $opportunity->update([
            'is_approved' => true,
            'approved_by' => $request->user()->id,
            'status'      => 'approved',
        ]);

        return response()->json(['message' => 'Oportunidad aprobada']);
    }

    // ── Advisor KPIs export ───────────────────────────────────────────────────
    public function export(Request $request)
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        $advisorPerformance = User::whereHas('roles', fn($q) => $q->where('name', 'asesor_academico'))
            ->withCount(['leads as total_leads' => fn($q) => $q->whereBetween('created_at', [$startDate, $endDate])])
            ->withCount(['leads as won_leads'   => fn($q) => $q->where('status', 'closed_won')->whereBetween('updated_at', [$startDate, $endDate])])
            ->get();

        $headers  = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="rendimiento_asesores.csv"',
        ];

        $callback = function () use ($advisorPerformance) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");
            fputcsv($file, ['ID Asesor', 'Nombre', 'Leads Asignados', 'Ventas Cerradas', 'Tasa de Conversion (%)'], ';');
            foreach ($advisorPerformance as $adv) {
                $conversion = $adv->total_leads > 0 ? round(($adv->won_leads / $adv->total_leads) * 100, 2) : 0;
                fputcsv($file, [$adv->id, $adv->name, $adv->total_leads, $adv->won_leads, $conversion], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    // ── Advisor individual stats ──────────────────────────────────────────────
    public function advisorStats(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasRole('admin') && !$user->hasRole('jefe') && $user->id != $id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        [$startDate, $endDate] = $this->resolveDateRange($request);

        $totalLeads = Lead::where('advisor_id', $id)
            ->whereBetween('created_at', [$startDate, $endDate])->count();

        $salesWonCount = DB::table('leads')->where('advisor_id', $id)
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where(fn($q2) => $q2->where('status', 'closed_won')->whereBetween('updated_at', [$startDate, $endDate]))
                  ->orWhereIn('id', fn($q3) => $q3->select('lead_id')->from('lead_interactions')
                      ->where('result', 'sold')->whereBetween('interacted_at', [$startDate, $endDate]));
            })->count();

        $interestedCount = DB::table('lead_interactions')
            ->join('leads', 'leads.id', '=', 'lead_interactions.lead_id')
            ->where('leads.advisor_id', $id)
            ->where('lead_interactions.result', 'interested')
            ->whereBetween('lead_interactions.interacted_at', [$startDate, $endDate])
            ->distinct('lead_id')->count();

        $notInterestedCount = DB::table('lead_interactions')
            ->join('leads', 'leads.id', '=', 'lead_interactions.lead_id')
            ->where('leads.advisor_id', $id)
            ->where(fn($q) => $q->where('lead_interactions.result', 'not_interested')->orWhere('leads.status', 'lost'))
            ->whereBetween('lead_interactions.interacted_at', [$startDate, $endDate])
            ->distinct('lead_id')->count();

        $pendingCount = Lead::where('advisor_id', $id)
            ->whereNotIn('status', ['closed_won', 'lost'])
            ->whereBetween('created_at', [$startDate, $endDate])->count();

        return response()->json([
            'total_assigned'  => $totalLeads,
            'sales_won'       => $salesWonCount,
            'interested'      => $interestedCount,
            'not_interested'  => $notInterestedCount,
            'pending'         => $pendingCount,
            'period'          => $request->input('period', 'este_mes'),
            'start_date'      => $startDate->toDateString(),
            'end_date'        => $endDate->toDateString(),
        ]);
    }

    // ── CONTROL DE MATRÍCULAS — Auditoría financiera ─────────────────────────
    public function getEnrollmentAuditData(Request $request)
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        $query = EnrollmentForm::with([
            'advisor:id,name',
            'course:id,name,enrollment_value,installments_count,installment_value',
        ])->whereBetween('created_at', [$startDate, $endDate]);

        if ($request->filled('advisor_id')) {
            $query->where('advisor_id', $request->advisor_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('requires_billing')) {
            $query->where('requires_billing', filter_var($request->requires_billing, FILTER_VALIDATE_BOOLEAN));
        }

        $enrollments = $query->orderBy('created_at', 'desc')->get();

        $summary = [
            'total_records'     => $enrollments->count(),
            'total_sale_value'  => (float) $enrollments->sum('sale_value'),
            'total_paid'        => (float) $enrollments->sum('total_paid'),
            'total_balance_due' => (float) $enrollments->sum('balance_due'),
            'billing_count'     => $enrollments->where('requires_billing', true)->count(),
            'payment_confirmed' => $enrollments->where('status', 'payment_confirmed')->count(),
        ];

        return response()->json(['data' => $enrollments, 'summary' => $summary]);
    }

    // ── Inline financial edit (jefe/admin only) ───────────────────────────────
    public function updateEnrollmentFinancials(Request $request, $id)
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $enrollment = EnrollmentForm::findOrFail($id);

        $validated = $request->validate([
            'sale_value'       => 'nullable|numeric|min:0',
            'requires_billing' => 'nullable|boolean',
            'bank_name'        => 'nullable|string|max:100',
            'payment_concept'  => 'nullable|string|max:50',
            'total_paid'       => 'nullable|numeric|min:0',
        ]);

        // Recalculate balance automatically
        $saleValue = array_key_exists('sale_value', $validated) ? $validated['sale_value'] : ($enrollment->sale_value ?? 0);
        $totalPaid = array_key_exists('total_paid', $validated) ? $validated['total_paid'] : ($enrollment->total_paid ?? 0);
        $validated['balance_due'] = $saleValue - $totalPaid;

        $enrollment->update($validated);

        return response()->json([
            'message' => 'Datos financieros actualizados',
            'data'    => $enrollment->fresh(['advisor', 'course']),
        ]);
    }

    // ── Detailed CSV export (mirrors CONTROL-DE-MATRICULA.xlsx) ──────────────
    public function exportDetailedReport(Request $request)
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        $enrollments = EnrollmentForm::with(['advisor:id,name', 'course:id,name'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at')
            ->get();

        $statusLabels = [
            'pending_send'      => 'Pendiente Envío',
            'sent'              => 'Enviado',
            'completed'         => 'Completado',
            'payment_pending'   => 'Pago Pendiente',
            'payment_confirmed' => 'Pago Confirmado',
            'in_review'         => 'En Revisión',
            'approved'          => 'Aprobado',
            'incomplete'        => 'Incompleto',
            'void'              => 'Anulado',
        ];

        $headers = [
            'Content-Type'        => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="control_matriculas_' . now()->format('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($enrollments, $statusLabels) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF"); // BOM UTF-8

            fputcsv($file, [
                'N°', 'Fecha', 'Asesor', 'Nombre Estudiante', 'Cédula/ID',
                'Ciudad', 'Email', 'Teléfono', 'Curso',
                '¿Facturación?', 'Banco', 'Concepto de Pago',
                'Valor de Venta', 'Total Pagado', 'Faltante (Saldo)',
                'N° Transacción', 'Estado', 'Fecha Completado', 'Pago Confirmado',
            ], ';');

            foreach ($enrollments as $i => $e) {
                fputcsv($file, [
                    $i + 1,
                    $e->created_at->format('d/m/Y'),
                    $e->advisor->name ?? 'N/A',
                    $e->student_name ?? 'N/A',
                    $e->student_id_number ?? 'N/A',
                    $e->student_city ?? 'N/A',
                    $e->student_email ?? 'N/A',
                    $e->student_phone ?? 'N/A',
                    $e->course->name ?? 'N/A',
                    $e->requires_billing ? 'SÍ' : 'NO',
                    $e->bank_name ?? 'N/A',
                    $e->payment_concept ?? 'N/A',
                    number_format((float) $e->sale_value, 2, '.', ''),
                    number_format((float) $e->total_paid, 2, '.', ''),
                    number_format((float) $e->balance_due, 2, '.', ''),
                    $e->bank_transaction_id ?? 'N/A',
                    $statusLabels[$e->status] ?? $e->status,
                    $e->completed_at ? $e->completed_at->format('d/m/Y') : 'N/A',
                    $e->payment_confirmed_at ? $e->payment_confirmed_at->format('d/m/Y') : 'N/A',
                ], ';');
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
