$ws = New-Object System.Net.WebSockets.ClientWebSocket
$uri = [System.Uri]'ws://localhost:9222/devtools/page/7AE1F5647649AB1F1EFC41A91BC69C9D'
$ct = [System.Threading.CancellationToken]::None
$ws.ConnectAsync($uri, $ct).Wait()
$cmd = '{"id":1,"method":"Page.captureScreenshot","params":{"format":"jpeg","quality":60}}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($cmd)
$ws.SendAsync([System.ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
$buf = [byte[]]::new(5MB)
$result = $ws.ReceiveAsync([System.ArraySegment[byte]]::new($buf), $ct).Result
$json = [System.Text.Encoding]::UTF8.GetString($buf, 0, $result.Count)
$data = ($json | ConvertFrom-Json).result.data
[System.IO.File]::WriteAllBytes('C:\projects\capsule-pro\screenshot.jpg', [Convert]::FromBase64String($data))
Write-Host 'done'
