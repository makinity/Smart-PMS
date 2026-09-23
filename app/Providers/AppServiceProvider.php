<?php

namespace App\Providers;

use App\Models\Ipcr;
use App\Observers\IpcrObserver;
use App\Services\AssignmentAi\AssignmentPredictorInterface;
use App\Services\AssignmentAi\SimulatedAssignmentPredictor;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Ipcr::observe(IpcrObserver::class);

        Mail::extend('brevo', function (array $config = []) {
            $key = $config['key'] ?? config('services.brevo.key') ?? env('BREVO_API_KEY');
            return new BrevoApiTransport($key);
        });
    }

    public function register(): void
    {
        $this->app->bind(AssignmentPredictorInterface::class, SimulatedAssignmentPredictor::class);
    }
}
