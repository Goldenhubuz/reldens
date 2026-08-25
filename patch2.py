import os

path = '/home/kai/projects/reldens/lib/game/server/theme-manager.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """            console.log('COPYING INSTALLER FROM:', this.reldensModuleInstallerPath, 'TO:', this.installerPath);
            fs.mkdirSync(this.installerPath, { recursive: true });
            fs.cpSync(this.reldensModuleInstallerPath, this.installerPath, { recursive: true });"""

replacement = """            console.log('COPYING INSTALLER FROM:', this.reldensModuleInstallerPath, 'TO:', this.installerPath);
            try {
                fs.mkdirSync(this.installerPath, { recursive: true });
                if (this.reldensModuleInstallerPath !== this.installerPath && require('path').resolve(this.reldensModuleInstallerPath) !== require('path').resolve(this.installerPath)) {
                    fs.cpSync(this.reldensModuleInstallerPath, this.installerPath, { recursive: true });
                }
            } catch(e) {
                console.error('Copy failed but continuing:', e.message);
            }"""

if target in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patch applied successfully!")
else:
    print("Target not found in file!")
