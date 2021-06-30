import { parse, parseNew } from './parseGitConfig'

test('parse correctly', () => {

  const content = `[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
	symlinks = false
	ignorecase = true
[remote "origin"]
	url = git@gitlab.ekwing.com:gz-server/teacher-app.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "3.0@dev"]
	remote = origin
	merge = refs/heads/3.0@dev
[submodule "src/components"]
	active = true
	url = git@gitlab.ekwing.com:sociosarbis/mobile-components.git
[status]
[status]
	submodulesummary = 1
[diff]
	submodule = log
[branch "3.0"]
	remote = origin
	merge = refs/heads/3.0
[alias]
	sdiff = ! git diff && git submodule foreach 'git diff'
[branch "new-scroll"]
	remote = origin
	merge = refs/heads/new-scroll
[branch "holiday-report"]
	remote = origin
	merge = refs/heads/holiday-report
[submodule "src/styles"]
	active = true
	url = git@gitlab.ekwing.com:gz-server/app-styles.git
[submodule "src/utils"]
	active = true
	url = git@gitlab.ekwing.com:gz-server/app-utils.git
[submodule "src/shared"]
	url = git@gitlab.ekwing.com:gz-server/moyi-shared.git
	active = true
`
  const res = parse(content)

  expect(res).toEqual({
    core: {
      repositoryformatversion: 0,
      filemode: false,
      bare: false,
      logallrefupdates: true,
      symlinks: false,
      ignorecase: true
    },
    remote: {
      origin: {
        url: 'git@gitlab.ekwing.com:gz-server/teacher-app.git',
        fetch: '+refs/heads/*:refs/remotes/origin/*'
      }
    },
    branch: {
      '3.0@dev': { remote: 'origin', merge: 'refs/heads/3.0@dev' },
      '3.0': { remote: 'origin', merge: 'refs/heads/3.0' },
      'new-scroll': { remote: 'origin', merge: 'refs/heads/new-scroll' },
      'holiday-report': { remote: 'origin', merge: 'refs/heads/holiday-report' }
    },
    submodule: {
      'src/components': {
        active: true,
        url: 'git@gitlab.ekwing.com:sociosarbis/mobile-components.git'
      },
      'src/styles': {
        active: true,
        url: 'git@gitlab.ekwing.com:gz-server/app-styles.git'
      },
      'src/utils': {
        active: true,
        url: 'git@gitlab.ekwing.com:gz-server/app-utils.git'
      },
      'src/shared': {
        url: 'git@gitlab.ekwing.com:gz-server/moyi-shared.git',
        active: true
      }
    },
    status: { submodulesummary: 1 },
    diff: { submodule: 'log' },
    alias: { sdiff: "! git diff && git submodule foreach 'git diff'" }
  })
})
