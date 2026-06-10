<?php

namespace App\Providers;

use App\Models\Ipcr;
use App\Observers\IpcrObserver;
use App\Services\AssignmentAi\AssignmentPredictorInterface;
use App\Services\AssignmentAi\SimulatedAssignmentPredictor;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Ipcr::observe(IpcrObserver::class);
    }

    public function register(): void
    {
        $this->app->bind(AssignmentPredictorInterface::class, SimulatedAssignmentPredictor::class);
    }
}
