<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTrial
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle($request, Closure $next)
{
    $user = auth()->user();

    if ($user) {

        if (!$user->trial_ends_at) {
            $user->trial_ends_at = now()->addDays(7);
            $user->save();
        }

        if (now()->greaterThan($user->trial_ends_at)) {
            return response()->json([
                'message' => 'Trial expired'
            ], 403);
        }
    }

    return $next($request);
}
}
