18:58:14.728 Running build in Washington, D.C., USA (East) – iad1
18:58:14.729 Build machine configuration: 2 cores, 8 GB
18:58:14.746 Cloning github.com/DEVANSHISHAH59/Lets-get-hired-App (Branch: main, Commit: f625ed4)
18:58:14.747 Skipping build cache, deployment was triggered without cache.
18:58:15.124 Cloning completed: 378.000ms
18:58:15.684 Running "vercel build"
18:58:16.788 Vercel CLI 51.6.1
18:58:17.421 Running "install" command: `npm install`...
18:58:39.334 npm warn deprecated next@14.2.29: This version has a security vulnerability. Please upgrade to a patched version. See https://nextjs.org/blog/security-update-2025-12-11 for more details.
18:58:39.406 
18:58:39.407 added 125 packages, and audited 126 packages in 22s
18:58:39.407 
18:58:39.407 25 packages are looking for funding
18:58:39.408   run `npm fund` for details
18:58:39.488 
18:58:39.489 2 vulnerabilities (1 moderate, 1 high)
18:58:39.489 
18:58:39.490 To address all issues, run:
18:58:39.490   npm audit fix --force
18:58:39.490 
18:58:39.490 Run `npm audit` for details.
18:58:39.563 Detected Next.js version: 14.2.29
18:58:39.565 Running "next build"
18:58:40.387 Attention: Next.js now collects completely anonymous telemetry regarding usage.
18:58:40.389 This information is used to shape Next.js' roadmap and prioritize features.
18:58:40.390 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
18:58:40.390 https://nextjs.org/telemetry
18:58:40.390 
18:58:40.449   ▲ Next.js 14.2.29
18:58:40.450 
18:58:40.466    Creating an optimized production build ...
18:58:52.152  ✓ Compiled successfully
18:58:52.155    Linting and checking validity of types ...
18:58:56.100 Failed to compile.
18:58:56.101 
18:58:56.101 ./src/app/page.tsx:486:10
18:58:56.102 Type error: Cannot find name 'lastUpdated'.
18:58:56.102 
18:58:56.102 [0m [90m 484 |[39m       [33m<[39m[33mdiv[39m className[33m=[39m[32m"flex items-center gap-2 mb-3"[39m[33m>[39m[0m
18:58:56.102 [0m [90m 485 |[39m         [33m<[39m[33mp[39m className[33m=[39m[32m"text-sm"[39m style[33m=[39m{{color[33m:[39m[32m'#10b981'[39m}}[33m>[39m[33mLive[39m news fetched [36mfrom[39m [33mTechCrunch[39m[33m,[39m [33mSilicon[39m [33mRepublic[39m[33m,[39m [33mVentureBeat[39m[33m.[39m[33m<[39m[33m/[39m[33mp[39m[33m>[39m[0m
18:58:56.103 [0m[31m[1m>[22m[39m[90m 486 |[39m         {lastUpdated [33m&&[39m [33m<[39m[33mspan[39m className[33m=[39m[32m"text-xs ml-auto"[39m style[33m=[39m{{color[33m:[39m[32m'#4a6a7a'[39m}}[33m>[39m[0m
18:58:56.103 [0m [90m     |[39m          [31m[1m^[22m[39m[0m
18:58:56.103 [0m [90m 487 |[39m           [33mUpdated[39m {[36mnew[39m [33mDate[39m(lastUpdated)[33m.[39mtoLocaleTimeString([32m'en-IE'[39m[33m,[39m{hour[33m:[39m[32m'2-digit'[39m[33m,[39mminute[33m:[39m[32m'2-digit'[39m})}[0m
18:58:56.103 [0m [90m 488 |[39m         [33m<[39m[33m/[39m[33mspan[39m[33m>[39m}[0m
18:58:56.103 [0m [90m 489 |[39m         [33m<[39m[33mdiv[39m className[33m=[39m[32m"w-2 h-2 rounded-full animate-pulse flex-shrink-0"[39m style[33m=[39m{{background[33m:[39m[32m'#10b981'[39m}}[33m/[39m[33m>[39m[0m
18:58:56.128 Next.js build worker exited with code: 1 and signal: null
18:58:56.145 Error: Command "next build" exited with 1
