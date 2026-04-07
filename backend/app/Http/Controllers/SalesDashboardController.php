<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Lead;
use App\Models\LeadOpportunity;
use App\Models\LeadInteraction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class SalesDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        // El Jefe puede ver a su equipo, el Admin ve a todos
        $advisorIds = [];
        if ($user->hasRole('admin') || $user->hasRole('jefe')) {
            $advisorIds = User::whereHas('roles', function($q) {
                $q->where('name', 'asesor_academico');
            })->pluck('id')->toArray();
        }


        $period = $request->input('period', 'este_mes');
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


        // 1. Tasa de Conversión (Leads -> Ganados)
        $totalLeads = Lead::whereIn('advisor_id', $advisorIds)
            ->whereBetween('created_at', [$startDate, $endDate])->count();
            
        $wonLeads = Lead::whereIn('advisor_id', $advisorIds)
            ->where('status', 'closed_won')
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();
        
        $conversionRate = $totalLeads > 0 ? ($wonLeads / $totalLeads) * 100 : 0;

        // 2. Tiempo Medio de Respuesta (Cálculo aproximado desde creación a primera interacción)
        // Optimizando con caché para evitar estrés en BD en producción (1 hora)
        $cacheKey = "avg_response_time_{$period}_" . implode(',', $advisorIds);
        $avgResponseTime = Cache::remember($cacheKey, 3600, function() use ($startDate, $endDate, $advisorIds) {
            return DB::table('leads')
                ->join('lead_interactions', 'leads.id', '=', 'lead_interactions.lead_id')
                ->select(DB::raw('AVG(EXTRACT(EPOCH FROM (lead_interactions.created_at - leads.created_at))) as avg_seconds'))
                ->whereIn('leads.advisor_id', $advisorIds)
                ->whereBetween('leads.created_at', [$startDate, $endDate])
                ->whereIn('lead_interactions.id', function($query) {
                    $query->select(DB::raw('MIN(id)'))
                        ->from('lead_interactions')
                        ->groupBy('lead_id');
                })
                ->value('avg_seconds');
        });

        // 3. Ventas por Asesor (Metas)
        $advisorPerformance = User::whereIn('id', $advisorIds)
            ->withCount(['leads as total_leads' => function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate]);
            }])
            ->withCount(['leads as won_leads' => function($q) use ($startDate, $endDate) {
                $q->where('status', 'closed_won')
                  ->whereBetween('updated_at', [$startDate, $endDate]);
            }])
            ->get()
            ->map(function($advisor) {

                return [
                    'id' => $advisor->id,
                    'name' => $advisor->name,
                    'total' => $advisor->total_leads,
                    'won' => $advisor->won_leads,
                    'conversion' => $advisor->total_leads > 0 ? round(($advisor->won_leads / $advisor->total_leads) * 100, 2) : 0,
                    'target' => 20, // Meta estática para demo
                ];
            });

        // 4. Motivos de pérdida
        $lossReasons = Lead::where('status', 'lost')
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        // 5. Proyección de Ventas (Pipeline Value)
        $pipelineValue = LeadOpportunity::whereHas('lead', function($q) use ($advisorIds) {
                $q->whereIn('advisor_id', $advisorIds);
            })
            ->whereIn('status', ['open', 'negotiating'])
            ->sum(DB::raw('estimated_value * (probability / 100)')) ?? 0;

        return response()->json([
            'conversion_rate' => round($conversionRate, 2),
            'avg_response_time_minutes' => round(($avgResponseTime ?? 0) / 60, 2),
            'pipeline_value' => (float)$pipelineValue,
            'advisor_performance' => $advisorPerformance,
            'leads_by_source' => Lead::whereIn('advisor_id', $advisorIds)
                ->select('source', DB::raw('count(*) as count'))
                ->groupBy('source')
                ->get(),
        ]);
    }


    public function approveOpportunity(Request $request, $id)
    {
        $opportunity = LeadOpportunity::findOrFail($id);
        
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $opportunity->update([
            'is_approved' => true,
            'approved_by' => $request->user()->id,
            'status' => 'approved'
        ]);

        return response()->json(['message' => 'Oportunidad aprobada']);
    }

    public function export(Request $request)
    {
        $period = $request->input('period', 'este_mes');
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


        $advisorPerformance = User::whereHas('roles', fn($q) => $q->where('name', 'asesor_academico'))
            ->withCount(['leads as total_leads' => function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate]);
            }])
            ->withCount(['leads as won_leads' => function($q) use ($startDate, $endDate) {
                $q->where('status', 'closed_won')
                  ->whereBetween('updated_at', [$startDate, $endDate]);
            }])
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="rendimiento_asesores.csv"',
        ];

        $callback = function () use ($advisorPerformance) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF"); // BOM for proper UTF-8 Excel reading
            fputcsv($file, ['ID Asesor', 'Nombre', 'Leads Asignados', 'Ventas Cerradas', 'Tasa de Conversion (%)'], ';');

            foreach ($advisorPerformance as $adv) {
                $conversion = $adv->total_leads > 0 ? round(($adv->won_leads / $adv->total_leads) * 100, 2) : 0;
                fputcsv($file, [$adv->id, $adv->name, $adv->total_leads, $adv->won_leads, $conversion], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function advisorStats(Request $request, $id)
    {
        $user = $request->user();
        if (!$user->hasRole('admin') && !$user->hasRole('jefe') && $user->id != $id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $period = $request->input('period', 'este_mes');
        $startDateStr = $request->input('start_date');
        $endDateStr = $request->input('end_date');

        if ($startDateStr && $endDateStr) {
            $startDate = Carbon::parse($startDateStr)->startOfDay();
            $endDate = Carbon::parse($endDateStr)->endOfDay();
        } else {
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
        }

        // 1. Total Leads Asignados (en el periodo de creación)
        $totalLeads = Lead::where('advisor_id', $id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        // 2. Ventas Concretadas (Leads con status 'closed_won' o interaccion 'sold')
        $salesWonCount = DB::table('leads')
            ->where('advisor_id', $id)
            ->where(function($q) use ($startDate, $endDate) {
                $q->where(function($q2) use ($startDate, $endDate) {
                    $q2->where('status', 'closed_won')
                       ->whereBetween('updated_at', [$startDate, $endDate]);
                })
                ->orWhereIn('id', function($q3) use ($startDate, $endDate) {
                    $q3->select('lead_id')
                       ->from('lead_interactions')
                       ->where('result', 'sold')
                       ->whereBetween('interacted_at', [$startDate, $endDate]);
                });
            })
            ->count();

        // 3. Clientes con Interés (Interaction 'interested')
        $interestedCount = DB::table('lead_interactions')
            ->join('leads', 'leads.id', '=', 'lead_interactions.lead_id')
            ->where('leads.advisor_id', $id)
            ->where('lead_interactions.result', 'interested')
            ->whereBetween('lead_interactions.interacted_at', [$startDate, $endDate])
            ->distinct('lead_id')
            ->count();

        // 4. No Interesados (Interaction 'not_interested' o status 'lost')
        $notInterestedCount = DB::table('lead_interactions')
            ->join('leads', 'leads.id', '=', 'lead_interactions.lead_id')
            ->where('leads.advisor_id', $id)
            ->where(function($q) {
                $q->where('lead_interactions.result', 'not_interested')
                  ->orWhere('leads.status', 'lost');
            })
            ->whereBetween('lead_interactions.interacted_at', [$startDate, $endDate])
            ->distinct('lead_id')
            ->count();

        // 5. Pendientes (leads creados en el periodo que no están cerrados)
        $pendingCount = Lead::where('advisor_id', $id)
            ->whereNotIn('status', ['closed_won', 'lost'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        return response()->json([
            'total_assigned' => $totalLeads,
            'sales_won' => $salesWonCount,
            'interested' => $interestedCount,
            'not_interested' => $notInterestedCount,
            'pending' => $pendingCount,
            'period' => $period,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString()
        ]);
    }
}


