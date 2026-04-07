<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemSettingController extends Controller
{
    public function getEnrollmentSetting()
    {
        $setting = DB::table('system_settings')
            ->where('key', 'enrollment_verification_enabled')
            ->first();
            
        return response()->json([
            'enabled' => $setting ? (bool)$setting->value : false,
            'description' => $setting ? $setting->description : null
        ]);
    }

    public function updateEnrollmentSetting(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean'
        ]);

        DB::table('system_settings')
            ->updateOrInsert(
                ['key' => 'enrollment_verification_enabled'],
                [
                    'value' => $request->enabled ? '1' : '0',
                    'updated_at' => now()
                ]
            );

        return response()->json(['message' => 'Configuración de matrícula actualizada exitosamente.']);
    }
}
