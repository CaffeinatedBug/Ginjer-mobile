# Manual Android QA

Status: NOT PERFORMED. User will run Expo Go on phone over LAN. Automated tests cannot satisfy these checks.

1. In mobile run npm ci then npx expo start --lan. Phone and PC must be on the same LAN; scan QR with matching Android Expo Go SDK.
2. At 360x800 compare every screen/sheet to prototype; repeat 320x568 and 412x915. Test font scaling, TalkBack focus/labels, 48dp touch targets, keyboard on every field and sheet, rotation and reduced motion.
3. Login: empty/invalid email, blank/wrong password, offline/slow/server failure; valid account persists after reload/kill/relaunch; token expiry returns to login once.
4. Select organisations/projects rapidly; old responses must not overwrite new scope. Pending org disabled. Empty/loading/error/search/no-results/Retry shown honestly.
5. Devices: search name/DevEUI/place, filters, refresh, scroll restoration, unknown/online/offline timestamps. No fabricated devices.
6. After devices are added, ask user for designated device NAME and safe command values BEFORE testing downlinks. Verify actual output mapping, toggle/colour encoding, one dispatch on double tap, server result, uplink confirmation. Simulate lost response: persistent uncertain lock, no resend.
7. Map: real GPS only, no-GPS list, markers, green C clusters, tap zoom, info sheet and View Map focus. Check unavailable key/network state.
8. Notifications: first snapshot yields no invented event; real new timestamp/value emits event; read state persists and navigates to correct device. Analytics uses only returned values.
9. Polling: network inspector shows no polls after background/unfocus; foreground resumes; org/project switch cancels old requests. Measure startup via Android launch timing, screen interaction frame time, memory via adb dumpsys meminfo. Record actual device/build/result.
10. Edit profile: validation, dirty discard including Android back, real save/reload; logout confirmation and cache/secret clear. Airplane mode, kill/relaunch, rapid double taps.
11. Repeat entire matrix twice after fixes. Record evidence in docs/QA_RESULTS.md. For APK additionally install actual EAS preview APK and verify cold launch/maps/session. Neither export nor Expo Go is APK verification.
