#!/usr/bin/env node

var fs = require('fs')
var respawn = require('respawn')

var BIN_SH = process.platform === 'android' ? '/system/bin/sh' : '/bin/sh'
var CMD_EXE = process.env.comspec || 'cmd.exe'

var servicesFile = process.argv[2]
var pidsFile = process.argv[3]

if (!servicesFile) {
  console.error('Usage: lil-pids [services-file] [pids-file?]')
  process.exit(1)
}

var padding = ['', ' ', '  ', '   ', '    ']
var services = []
var monitors = {}

fs.watch(servicesFile, update)
fs.watchFile(servicesFile, update) // watch seems buggy on linux
update()

function writePids (cb) {
  if (!pidsFile) return

  var cmds = Object.keys(monitors)
  var lines = cmds.map(function (cmd) {
    if (!monitors[cmd].pid) return
    return prefix(monitors[cmd].pid) + cmd + '\n'
  })

  fs.writeFile(pidsFile, lines.join(''), cb)
}

function update () {
  read(function (err, latest) {
    if (err) throw err

    services.forEach(function (s) {
      if (latest.indexOf(s) === -1) stop(s)
    })
    latest.forEach(function (s) {
      if (services.indexOf(s) === -1) start(s)
    })

    services = latest
  })
}

function stop (cmd) {
  monitors[cmd].stop()
  delete monitors[cmd]
}

function start (cmd) {
  var m = monitors[cmd] = spawn(cmd)

  m.on('spawn', onspawn)
  m.on('exit', onexit)
  m.on('stdout', onstdout)
  m.on('stderr', onstderr)

  m.start()

  function onstdout (message) {
    onlog('(out)', message)
  }

  function onstderr (message) {
    onlog('(err)', message)
  }

  function onspawn () {
    console.log(prefix(m.pid) + '!!!!! SPAWN ' + cmd)
    writePids()
  }

  function onexit (code) {
    console.log(prefix(m.pid) + '!!!!! EXIT(' + code + ') ' + cmd)
    writePids()
  }

  function onlog (type, message) {
    var ln = message.toString().split('\n')
    for (var i = 0; i < ln.length; i++) ln[i] = prefix(m.pid) + type + ' ' + ln[i]
    console.log(ln.join('\n'))
  }
}

function read (cb) {
  fs.readFile(servicesFile, 'utf-8', function (err, source) {
    if (err && err.code === 'ENOENT') return cb(null, [])
    if (err) return cb(err)

    var lines = source.trim().split('\n')
      .map(function (line) {
        return line.trim()
      })
      .filter(function (line) {
        return line && line[0] !== '#'
      })

    cb(null, lines)
  })
}

function prefix (pid) {
  var spid = pid.toString()
  return spid + padding[5 - spid.length] + ': '
}

function spawn (cmd) {
  if (process.platform !== 'win32') return respawn([BIN_SH, '-c', cmd], {maxRestarts: Infinity})
  return respawn([CMD_EXE, '/d', '/s', '/c', '"' + cmd + '"'], {maxRestarts: Infinity, windowsVerbatimArguments: true})
}
