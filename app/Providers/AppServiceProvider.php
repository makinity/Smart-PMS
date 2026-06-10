<?php

namespace App\Providers;

use App\Models\Ipcr;
use App\Observers\IpcrObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Ipcr::observe(IpcrObserver::class);
    }
}
