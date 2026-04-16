<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ResetTransactionalData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:reset-transactional {--force : Force the operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Resets transactional data (leads, enrollments, tickets, notifications) while preserving user profiles, courses, areas, and settings.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force') && !$this->confirm('WARNING: This will delete ALL transactional data (leads, enrollments, tickets, etc.). User accounts, courses, and areas will be preserved. Do you wish to continue?')) {
            $this->info('Operation cancelled.');
            return;
        }

        $tables = [
            'lead_opportunities',
            'lead_interactions',
            'leads',
            'enrollment_form_histories',
            'enrollment_payments',
            'enrollment_forms',
            'ticket_histories',
            'ticket_replies',
            'ticket_resources',
            'tickets',
            'email_campaign_logs',
            'email_campaigns',
            'email_templates',
            'email_settings',
            'event_participants',
            'events',
            'notifications',
            'jobs',
            'failed_jobs',
            'job_batches',
            'cache',
            'cache_locks',
            'password_reset_tokens',
        ];

        $this->output->progressStart(count($tables));

        \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();

        foreach ($tables as $table) {
            if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
                \Illuminate\Support\Facades\DB::table($table)->truncate();
            }
            $this->output->progressAdvance();
        }

        \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();

        $this->output->progressFinish();

        $this->info('Transactional data has been successfully cleared.');
        
        $this->call('cache:clear');
        $this->info('Application cache cleared.');
    }
}
