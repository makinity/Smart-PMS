<?php

namespace App\Models\Concerns;

use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Shared activity-logging configuration for audited models.
 *
 * Models opt in with `use RecordsActivity;`. By default every fillable
 * attribute is logged (minus sensitive keys); override the set per-model
 * with `protected array $activitylogAttributes = [...]`.
 */
trait RecordsActivity
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        $attributes = property_exists($this, 'activitylogAttributes')
            ? $this->activitylogAttributes
            : $this->getFillable();

        $attributes = array_values(array_diff($attributes, ['password', 'remember_token']));

        return LogOptions::defaults()
            ->logOnly($attributes)
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName(class_basename($this));
    }
}
