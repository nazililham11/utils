# Install Scoop
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression


# Install Git
scoop bucket add main
scoop bucket add extras
scoop install main/git



# Install Other Utility thing
scoop install main/7zip
scoop install extras/aimp
scoop install main/aria2
scoop install extras/ditto
scoop install extras/mpc-hc-fork
scoop install extras/irfanview
scoop install extras/quick-picture-viewer
scoop install extras/winaero-tweaker
scoop install extras/sumatrapdf
scoop install extras/xmousebuttoncontrol
scoop install extras/notepad2-zufuliu
scoop install extras/obsidian
scoop install extras/windows-virtualdesktop-helper
scoop install extras/q-dir


# Install Programing thing
scoop install extras/autohotkey
scoop install main/pnpm
scoop install extras/sublime-merge
scoop install extras/sublime-text
scoop install extras/arduino
scoop install main/ffmpeg
scoop install main/nvm
scoop install main/python
scoop install extras/vscode
scoop install extras/windows-terminal
