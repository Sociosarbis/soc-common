import { join, isAbsolute } from 'path'
import { promises } from 'fs'
import { parseNew, astToObj } from '@/string/parseGitConfig'
import execa from 'execa'

async function initRepo(dir: string) {
  const res = await execa('git', ['rev-parse', '--show-toplevel'], { cwd: dir })
  if (res.exitCode !== 0) {
    console.log('repo has not initialized')
    await execa('git', ['init'], { cwd: dir })
    return dir
  }
  return res.stdout.trim()
}

export async function initSubmodules(dir: string) {
  const configFile = join(dir, './.gitmodules')
  const fileStat = await promises.stat(configFile)
  if (fileStat.isFile()) {
    console.log(".gitmodules found")
    const repoRoot = await initRepo(dir)
    if (repoRoot !== dir) {
      await execa('git', ['init'], { cwd: dir })
    }
    const config = astToObj(parseNew(await promises.readFile(configFile, { encoding: 'utf-8' })).ast)
    if (config.submodule && typeof config.submodule === 'object') {
      for (const key of Object.keys(config.submodule)) {
        if (!isAbsolute(key)) {
          if (typeof config.submodule[key].url === 'string') {
            const dest = join(dir, key)
            const destStat = await promises.stat(dest)
            if (!(destStat.isDirectory() || destStat.isFile())) {
              await execa('git', ['submodule', 'add', config.submodule[key].url, key])
            } else {
              console.log(`path ${dest} is not empty`)
            }
          }
        } else {
          console.log(`${key} is not a relative path`)
        }
      }
    }
  }
}
