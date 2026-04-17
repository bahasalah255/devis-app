<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTrial
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user) {
            return $next($request);
        }

        if (empty($user->trial_ends_at)) {
            $user->trial_ends_at = now()->addDays(7);
            $user->save();
            return $next($request);
        }

        $trialEndsAt = $user->trial_ends_at;

        if (now()->greaterThan($trialEndsAt)) {
            return response()->json([
                'message' => 'Trial expired'
            ], 403);
        }

        return $next($request);
    }
}