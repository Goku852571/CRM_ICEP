<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Lead;
use Illuminate\Support\Facades\DB;
use App\Notifications\StalledLeadNotification;

class CheckStalledLeads extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'crm:check-stalled-leads';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Chequea leads estancados y notifica a sus respectivos asesores';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $staleDays = (int)(DB::table('system_settings')->where('key', 'lead_stale_days')->value('value') ?? 5);

        $stalledLeads = Lead::query()
            ->whereNotIn('status', ['won', 'lost', 'rejected'])
            ->where('updated_at', '<', now()->subDays($staleDays))
            ->whereNotNull('advisor_id')
            ->with('advisor')
            ->get();

        $count = 0;
        foreach ($stalledLeads as $lead) {
            if ($lead->advisor) {
                // Ensure we don't spam. Maybe check if there's already a recent notification, 
                // but for now we follow the plan to notify.
                $lead->advisor->notify(new StalledLeadNotification($lead, $staleDays));
                $count++;
            }
        }

        $this->info("Notificados {$count} asesores de leads estancados luego de {$staleDays} días.");
    }
}
