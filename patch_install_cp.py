import os
path = '/home/kai/projects/reldens/lib/game/server/theme-manager.js'
with open(path, 'r') as f:
    content = f.read()

target = "FileHandler.copyFolderSync(installerPath, projectInstallerPath);"
replacement = "if (installerPath !== projectInstallerPath && require('path').resolve(installerPath) !== require('path').resolve(projectInstallerPath)) { FileHandler.copyFolderSync(installerPath, projectInstallerPath); }"

content = content.replace(target, replacement)

with open(path, 'w') as f:
    f.write(content)
