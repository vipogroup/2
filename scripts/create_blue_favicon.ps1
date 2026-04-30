$width = 64
$height = 64
$xorStride = $width * 4
$andStride = [math]::Ceiling($width / 32) * 4
$xorSize = $xorStride * $height
$andSize = $andStride * $height

$totalSize = 6 + 16 + 40 + $xorSize + $andSize
$bytes = New-Object byte[] $totalSize

# ICONDIR
$bytes[0] = 0
$bytes[1] = 0
$bytes[2] = 1
$bytes[3] = 0
$bytes[4] = 1
$bytes[5] = 0
$bytes[6] = [byte]$width
$bytes[7] = [byte]$height
$bytes[8] = 0
$bytes[9] = 0
$bytes[10] = 1
$bytes[11] = 0
$bytes[12] = 32
$bytes[13] = 0

[BitConverter]::GetBytes([uint32](40 + $xorSize + $andSize)).CopyTo($bytes, 14)
[BitConverter]::GetBytes([uint32](6 + 16)).CopyTo($bytes, 18)

$bmpOffset = 6 + 16

[BitConverter]::GetBytes([uint32]40).CopyTo($bytes, $bmpOffset + 0)
[BitConverter]::GetBytes([int32]$width).CopyTo($bytes, $bmpOffset + 4)
[BitConverter]::GetBytes([int32]($height * 2)).CopyTo($bytes, $bmpOffset + 8)
[BitConverter]::GetBytes([uint16]1).CopyTo($bytes, $bmpOffset + 12)
[BitConverter]::GetBytes([uint16]32).CopyTo($bytes, $bmpOffset + 14)
[BitConverter]::GetBytes([uint32]0).CopyTo($bytes, $bmpOffset + 16)
[BitConverter]::GetBytes([uint32]$xorSize).CopyTo($bytes, $bmpOffset + 20)
[BitConverter]::GetBytes([int32]0).CopyTo($bytes, $bmpOffset + 24)
[BitConverter]::GetBytes([int32]0).CopyTo($bytes, $bmpOffset + 28)
[BitConverter]::GetBytes([uint32]0).CopyTo($bytes, $bmpOffset + 32)
[BitConverter]::GetBytes([uint32]0).CopyTo($bytes, $bmpOffset + 36)

$xorOffset = $bmpOffset + 40

$blueB = 0xC8
$blueG = 0x50
$blueR = 0x1E
$alpha = 0xFF

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixelIndex = (($height - 1 - $y) * $width + $x) * 4
        $base = $xorOffset + $pixelIndex
        $bytes[$base + 0] = [byte]$blueB
        $bytes[$base + 1] = [byte]$blueG
        $bytes[$base + 2] = [byte]$blueR
        $bytes[$base + 3] = [byte]$alpha
    }
}

$andOffset = $xorOffset + $xorSize
for ($i = 0; $i -lt $andSize; $i++) {
    $bytes[$andOffset + $i] = 0x00
}

$publicDir = Join-Path -Path $PSScriptRoot -ChildPath "..\public"
$iconPath = Join-Path -Path $publicDir -ChildPath "favicon.ico"

[IO.Directory]::CreateDirectory($publicDir) | Out-Null
[IO.File]::WriteAllBytes($iconPath, $bytes)
