#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const fuzzy = require('fuzzy')

const firstArgument = process.argv[2]
const args = process.argv.slice(3)
const print = console.log
let tasksFile = '~/.tasks/tasks.md'
let tasksFolder
let lines
let taskLines
let annotatedLines
let numberCompleted
let numberRemaining

// Create storage folder and file if necessary
tasksFile = tasksFile.replace('~', os.homedir())
tasksFolder = path.dirname(tasksFile)
if (!fs.existsSync(tasksFolder)) {
  fs.mkdirSync(tasksFolder)
}
if (!fs.existsSync(tasksFile)) {
  fs.writeFileSync(tasksFile, '')
}

const getTasks = function() {
  lines = fs.readFileSync(tasksFile, 'utf8').split('\n')
  annotatedLines = lines.map(function(line, index, array) {
    return {
      line,
      lineNumber: index,
    }
  })
  taskLines = annotatedLines.filter(function(annotatedLine) {
    return /^- \[[ xX]\] /.test(annotatedLine.line)
  })

  return taskLines.map(function(annotatedLine) {
    return {
      isCompleted: /^- \[[xX]\]/.test(annotatedLine.line),
      title: annotatedLine.line.slice(6),
      line: annotatedLine.line,
      lineNumber: annotatedLine.lineNumber,
    }
  })
}

const logTasks = function() {
  const tasks = getTasks()

  numberCompleted = tasks.filter(t => t.isCompleted).length
  numberRemaining = tasks.length - numberCompleted
  print(
    `You have ${numberRemaining} tasks remaining (${numberCompleted} completed):`,
  )
  print(tasks.map(task => task.line).join('\n'))
}

const addTask = function(title) {
  const taskTitle = `- [ ] ${title}\n`
  const fileHasTrailingNewline =
    fs
      .readFileSync(tasksFile, 'utf8')
      .split('\n')
      .slice(-1)[0] === ''

  fs.appendFileSync(tasksFile, (fileHasTrailingNewline ? '' : '\n') + taskTitle)
  logTasks()
}

const completeTask = function(fuzzyTask) {
  const tasks = getTasks()
  const options = {
    extract(task) {
      return task.title
    },
  }
  const results = fuzzy.filter(fuzzyTask, tasks, options)

  // TODO: Use results[].score to handle cases such as the same search string existing in multiple tasks
  if (results.length === 0) {
    print('Could not find task')
  } else {
    annotatedLines[
      results[0].original.lineNumber
    ].line = results[0].original.line.replace('[ ]', '[x]')
    fs.writeFileSync(
      tasksFile,
      annotatedLines.map(line => line.line).join('\n'),
    )
    print(`Completed: ${results[0].original.title}`)
  }
  logTasks()
}

const markTaskIncomplete = function(fuzzyTask) {
  const tasks = getTasks()
  const options = {
    extract(task) {
      return task.title
    },
  }
  const results = fuzzy.filter(fuzzyTask, tasks, options)

  if (results.length === 0) {
    print('Could not find task')
  } else {
    annotatedLines[
      results[0].original.lineNumber
    ].line = results[0].original.line.replace(/\[[xX]\]/, '[ ]')
    fs.writeFileSync(
      tasksFile,
      annotatedLines.map(line => line.line).join('\n'),
    )
    print(`Incomplete: ${results[0].original.title}`)
  }
  logTasks()
}

const removeTask = function(fuzzyTask) {
  const tasks = getTasks()
  const options = {
    extract(task) {
      return task.title
    },
  }
  const results = fuzzy.filter(fuzzyTask, tasks, options)

  if (results.length === 0) {
    print('Could not find task')
  } else {
    annotatedLines.splice(results[0].original.lineNumber, 1)
    fs.writeFileSync(
      tasksFile,
      annotatedLines.map(line => line.line).join('\n'),
    )
    print(`Removed: ${results[0].original.title}`)
  }
  logTasks()
}

const prioritizeTask = function(fuzzyTask) {
  const tasks = getTasks()
  const options = {
    extract(task) {
      return task.title
    },
  }
  const results = fuzzy.filter(fuzzyTask, tasks, options)

  if (results.length === 0) {
    print('Could not find task')
  } else {
    const task = annotatedLines.splice(results[0].original.lineNumber, 1)[0]
    annotatedLines.unshift(task)
    fs.writeFileSync(
      tasksFile,
      annotatedLines.map(line => line.line).join('\n'),
    )
    print(`Removed: ${results[0].original.title}`)
  }
  logTasks()
}

const deprioritizeTask = function(fuzzyTask) {
  const tasks = getTasks()
  const options = {
    extract(task) {
      return task.title
    },
  }
  const results = fuzzy.filter(fuzzyTask, tasks, options)

  if (results.length === 0) {
    print('Could not find task')
  } else {
    const task = annotatedLines.splice(results[0].original.lineNumber, 1)[0]
    annotatedLines.push(task)
    fs.writeFileSync(
      tasksFile,
      annotatedLines.map(line => line.line).join('\n'),
    )
    print(`Removed: ${results[0].original.title}`)
  }
  logTasks()
}

const appendToTask = function(fuzzyTask, stringToAppend) {
  const tasks = getTasks()
  const options = {
    extract(task) {
      return task.title
    },
  }
  const results = fuzzy.filter(fuzzyTask, tasks, options)

  if (results.length === 0) {
    print('Could not find task')
  } else {
    annotatedLines[results[0].original.lineNumber].line = `${
      results[0].original.line
    } ${stringToAppend}`
    fs.writeFileSync(
      tasksFile,
      annotatedLines.map(line => line.line).join('\n'),
    )
    print(`Appended to: ${results[0].original.title} ${stringToAppend}`)
  }
  logTasks()
}

const openTask = function() {
  const exec = require('child_process').exec
  let open

  if (process.platform === 'darwin') {
    open = 'open'
  } else if (process.platform === 'win32' || process.platform === 'win64') {
    open = 'start'
  } else {
    open = 'xdg-open'
  }
  exec(`${open} ${tasksFile}`)
}

if (firstArgument === 'log' || firstArgument === 'ls') {
  logTasks()
} else if (
  firstArgument === 'check' ||
  firstArgument === 'complete' ||
  firstArgument === 'finish' ||
  firstArgument === 'done'
) {
  if (args.length === 0) {
    print('No search text provided')
  } else {
    completeTask(args.join(' '))
  }
} else if (firstArgument === 'uncheck' || firstArgument === 'incomplete') {
  if (args.length === 0) {
    print('No search text provided')
  } else {
    markTaskIncomplete(args.join(' '))
  }
} else if (firstArgument === 'remove' || firstArgument === 'delete') {
  if (args.length === 0) {
    print('No search text provided')
  } else {
    removeTask(args.join(' '))
  }
} else if (firstArgument === 'prioritize' || firstArgument === 'top') {
  if (args.length === 0) {
    print('No search text provided')
  } else {
    prioritizeTask(args.join(' '))
  }
} else if (firstArgument === 'deprioritize' || firstArgument === 'bottom') {
  if (args.length === 0) {
    print('No search text provided')
  } else {
    deprioritizeTask(args.join(' '))
  }
} else if (firstArgument === 'append') {
  if (args.length === 0) {
    print('No search text provided')
  } else if (args.length === 1) {
    print('No text provided to append')
  } else {
    appendToTask(args.slice(0, 1)[0], args.slice(1).join(' '))
  }
} else if (firstArgument === 'open' || firstArgument === 'edit') {
  openTask()
} else if (firstArgument === 'add') {
  if (args.length === 0) {
    print('No search text provided')
  } else {
    addTask(args.join(' '))
  }
} else if (firstArgument !== undefined) {
  // Default to "add" command if arguments exist without matching a command
  addTask(process.argv.slice(2).join(' '))
} else {
  // Log tasks if no arguments are provided
  logTasks()
}
