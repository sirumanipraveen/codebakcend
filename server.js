// // // server.js
// // const express = require('express');
// // const cors = require('cors');
// // const fs = require('fs/promises');
// // const fsSync = require('fs');
// // const os = require('os');
// // const path = require('path');
// // const { spawn } = require('child_process');

// // const app = express();
// // app.use(cors());
// // app.use(express.json({ limit: '200kb' }));

// // const PORT =  process.env.PORT || 4000; 

// // // Basic allowed languages & how to run them inside Docker
// // const RUNTIMES = {
// //   python: {
// //     filename: 'main.py',
// //     image: 'python:3.11-slim',
// //     runCmd: 'python main.py'
// //   },
// //   java: {
// //     filename: 'Main.java',
// //     image: 'openjdk:17',
// //     // compile then run
// //     runCmd: 'javac Main.java && java Main'
// //   }
// // };

// // // Helper: create temp dir
// // async function makeTempDir() {
// //   return await fs.mkdtemp(path.join(os.tmpdir(), 'runcode-'));
// // }

// // // POST /run
// // // body: { language: 'python'|'java', code: '...', stdin: '...' (optional) }
// // app.post('/run', async (req, res) => {
// //   try {
// //     const { language, code, stdin = '' } = req.body || {};

// //     if (!language || !RUNTIMES[language]) {
// //       return res.status(400).json({ error: 'Unsupported or missing language.' });
// //     }

// //     if (!code || typeof code !== 'string') {
// //       return res.status(400).json({ error: 'Missing code' });
// //     }

// //     // Basic safety checks
// //     if (code.length > 200000) {
// //       return res.status(400).json({ error: 'Code too large.' });
// //     }

// //     const runtime = RUNTIMES[language];
// //     const tempDir = await makeTempDir();
// //     const filePath = path.join(tempDir, runtime.filename);
// //     await fs.writeFile(filePath, code, 'utf8');

// //     // Create a small input file if stdin present
// //     if (stdin && stdin.length > 0) {
// //       await fs.writeFile(path.join(tempDir, 'stdin.txt'), stdin, 'utf8');
// //     }

// //     // Build docker run args
// //     // - network none to isolate, --rm to remove container
// //     // resource limits are set (memory, cpus, pids-limit)
// //     const dockerArgs = [
// //       'run', '--rm', '-i',
// //       '--network', 'none',
// //       '--pids-limit', '64',
// //       '--memory', '256m',
// //       '--cpus', '0.5',
// //       '-v', `${tempDir}:/code`, // mount code
// //       '-w', '/code',
// //       runtime.image,
// //       '/bin/bash', '-lc',
// //       runtime.runCmd
// //     ];

// //     const proc = spawn('docker', dockerArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

// //     // If stdin.txt exists, pipe it into container's stdin
// //     if (stdin && stdin.length > 0) {
// //       // stream stdin content then close
// //       proc.stdin.write(stdin);
// //       proc.stdin.end();
// //     } else {
// //       proc.stdin.end();
// //     }

// //     let stdout = '';
// //     let stderr = '';
// //     let timedOut = false;

// //     // collect output
// //     proc.stdout.on('data', (d) => { stdout += d.toString(); });
// //     proc.stderr.on('data', (d) => { stderr += d.toString(); });

// //     // Timeout / kill after 15 seconds
// //     const TIME_LIMIT_MS = 15000;
// //     const to = setTimeout(() => {
// //       timedOut = true;
// //       // kill docker process
// //       try { proc.kill('SIGKILL'); } catch (e) { /* ignore */ }
// //     }, TIME_LIMIT_MS);

// //     proc.on('error', (err) => {
// //       clearTimeout(to);
// //       cleanupTemp(tempDir).catch(() => {});
// //       return res.status(500).json({ error: 'Failed to run docker. Is Docker installed and running?', detail: err.message });
// //     });

// //     proc.on('close', async (code) => {
// //       clearTimeout(to);

// //       // parse simple error line numbers for editor decorations
// //       const errorLines = parseErrorLines(language, stderr);

// //       // cleanup temp dir
// //       await cleanupTemp(tempDir).catch(() => {});

// //       res.json({
// //         stdout,
// //         stderr,
// //         exitCode: code,
// //         timedOut,
// //         errorLines // [{line: 5, message: 'SyntaxError: ...'}, ...]
// //       });
// //     });

// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).json({ error: 'Server error', detail: err.message });
// //   }
// // });

// // function parseErrorLines(language, stderr) {
// //   const res = [];
// //   if (!stderr) return res;

// //   try {
// //     if (language === 'python') {
// //       // look for: File "/code/main.py", line 4
// //       const regex = /File "\/code\/[^"]+", line (\d+)(?:, in .*)?\n\s*(.*)/g;
// //       let m;
// //       while ((m = regex.exec(stderr)) !== null) {
// //         const line = parseInt(m[1], 10);
// //         const msg = m[2] || '';
// //         res.push({ line, message: msg });
// //       }
// //     } else if (language === 'java') {
// //       // look for lines like Main.java:12)
// //       const regex = /(?:at .*?\(|\s*)(Main\.java):(\d+)\)/g;
// //       let m;
// //       while ((m = regex.exec(stderr)) !== null) {
// //         const line = parseInt(m[2], 10);
// //         res.push({ line, message: 'Exception at line ' + line });
// //       }
// //       // fallback find "Exception in thread" first stack frame with :NUMBER
// //       if (res.length === 0) {
// //         const fallback = /at .*Main\.(.*)\(Main.java:(\d+)\)/;
// //         const mm = fallback.exec(stderr);
// //         if (mm) res.push({ line: parseInt(mm[2], 10), message: 'Exception' });
// //       }
// //     }
// //   } catch (e) {
// //     // ignore parse errors
// //   }
// //   return res;
// // }

// // async function cleanupTemp(dirPath) {
// //   if (!dirPath) return;
// //   // best effort remove
// //   try {
// //     if (fsSync.existsSync(dirPath)) {
// //       await fs.rm(dirPath, { recursive: true, force: true });
// //     }
// //   } catch (e) {
// //     // ignore
// //   }
// // }

// // app.get('/', (req, res) => res.json({ ok: true, msg: 'Code runner server' }));

// // app.listen(PORT, () => {
// //   console.log(`Code runner server listening at http://localhost:${PORT}`);
// // });


// // server.js
// const express = require('express');
// const cors = require('cors');
// const fs = require('fs/promises');
// const fsSync = require('fs');
// const os = require('os');
// const path = require('path');
// const { spawn } = require('child_process');

// const app = express();
// app.use(cors());
// app.use(express.json({ limit: '200kb' }));

// const PORT = process.env.PORT || 4000;

// // Supported languages & runtime info
// const RUNTIMES = {
//   python: {
//     filename: 'main.py'
//   },
//   java: {
//     filename: 'Main.java'
//   }
// };

// // Helper: create temp directory
// async function makeTempDir() {
//   return await fs.mkdtemp(path.join(os.tmpdir(), 'runcode-'));
// }

// // POST /run
// // body: { language: 'python'|'java', code: '...', stdin: '...' (optional) }
// app.post('/run', async (req, res) => {
//   try {
//     const { language, code, stdin = '' } = req.body || {};

//     if (!language || !RUNTIMES[language]) {
//       return res.status(400).json({ error: 'Unsupported or missing language.' });
//     }

//     if (!code || typeof code !== 'string') {
//       return res.status(400).json({ error: 'Missing code' });
//     }

//     if (code.length > 200000) {
//       return res.status(400).json({ error: 'Code too large.' });
//     }

//     const runtime = RUNTIMES[language];
//     const tempDir = await makeTempDir();
//     const filePath = path.join(tempDir, runtime.filename);
//     await fs.writeFile(filePath, code, 'utf8');

//     // Decide command based on language
//     let cmd, args;
//     if (language === 'python') {
//       cmd = 'python3';
//       args = [filePath];
//     } else if (language === 'java') {
//       cmd = 'bash';
//       args = ['-c', `javac ${filePath} && java -cp ${tempDir} Main`];
//     }

//     const proc = spawn(cmd, args);

//     // Pipe stdin if provided
//     if (stdin) proc.stdin.write(stdin);
//     proc.stdin.end();

//     let stdout = '';
//     let stderr = '';
//     let timedOut = false;

//     // Timeout after 15 seconds
//     const TIME_LIMIT_MS = 15000;
//     const to = setTimeout(() => {
//       timedOut = true;
//       try { proc.kill('SIGKILL'); } catch (e) {}
//     }, TIME_LIMIT_MS);

//     proc.stdout.on('data', (d) => { stdout += d.toString(); });
//     proc.stderr.on('data', (d) => { stderr += d.toString(); });

//     proc.on('close', async (code) => {
//       clearTimeout(to);
//       const errorLines = parseErrorLines(language, stderr);
//       await cleanupTemp(tempDir).catch(() => {});
//       res.json({ stdout, stderr, exitCode: code, timedOut, errorLines });
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error', detail: err.message });
//   }
// });

// // Parse error lines for editor decorations
// function parseErrorLines(language, stderr) {
//   const res = [];
//   if (!stderr) return res;

//   try {
//     if (language === 'python') {
//       const regex = /File ".*", line (\d+)(?:, in .*)?\n\s*(.*)/g;
//       let m;
//       while ((m = regex.exec(stderr)) !== null) {
//         const line = parseInt(m[1], 10);
//         const msg = m[2] || '';
//         res.push({ line, message: msg });
//       }
//     } else if (language === 'java') {
//       const regex = /(?:at .*?\(|\s*)(Main\.java):(\d+)\)/g;
//       let m;
//       while ((m = regex.exec(stderr)) !== null) {
//         const line = parseInt(m[2], 10);
//         res.push({ line, message: 'Exception at line ' + line });
//       }
//       if (res.length === 0) {
//         const fallback = /at .*Main\.(.*)\(Main.java:(\d+)\)/;
//         const mm = fallback.exec(stderr);
//         if (mm) res.push({ line: parseInt(mm[2], 10), message: 'Exception' });
//       }
//     }
//   } catch (e) {
//     // ignore parse errors
//   }
//   return res;
// }

// // Cleanup temp folder
// async function cleanupTemp(dirPath) {
//   if (!dirPath) return;
//   try {
//     if (fsSync.existsSync(dirPath)) {
//       await fs.rm(dirPath, { recursive: true, force: true });
//     }
//   } catch (e) {}
// }

// // Test route
// app.get('/', (req, res) => res.json({ ok: true, msg: 'Code runner server' }));

// app.listen(PORT, () => {
//   console.log(`Code runner server listening at http://localhost:${PORT}`);
// });
// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '500kb' })); // allow larger code input

const PORT = process.env.PORT || 4000;

// Supported languages & runtime info
const RUNTIMES = {
  python: {
    filename: 'main.py',
    run: (filePath, tempDir) => ['python3', [filePath]]
  },
  java: {
    filename: 'Main.java',
    run: (filePath, tempDir) => ['bash', ['-c', `javac ${filePath} && java -cp ${tempDir} Main`]]
  },
  cpp: {
    filename: 'main.cpp',
    run: (filePath, tempDir) => ['bash', ['-c', `g++ ${filePath} -o ${tempDir}/a.out && ${tempDir}/a.out`]]
  },
  javascript: {
    filename: 'main.js',
    run: (filePath, tempDir) => ['node', [filePath]]
  }
};

// Helper: create temp directory
async function makeTempDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'runcode-'));
}

// POST /run
// body: { language: 'python'|'java'|'cpp'|'javascript', code: '...', stdin: '...' (optional) }
app.post('/run', async (req, res) => {
  try {
    const { language, code, stdin = '' } = req.body || {};

    if (!language || !RUNTIMES[language]) {
      return res.status(400).json({ error: 'Unsupported or missing language.' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing code' });
    }

    if (code.length > 500000) { // prevent abuse with huge code
      return res.status(400).json({ error: 'Code too large.' });
    }

    const runtime = RUNTIMES[language];
    const tempDir = await makeTempDir();
    const filePath = path.join(tempDir, runtime.filename);
    await fs.writeFile(filePath, code, 'utf8');

    const [cmd, args] = runtime.run(filePath, tempDir);
    const proc = spawn(cmd, args, { cwd: tempDir });

    // Pipe stdin if provided
    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Timeout after 15 seconds
    const TIME_LIMIT_MS = 15000;
    const to = setTimeout(() => {
      timedOut = true;
      try { proc.kill('SIGKILL'); } catch (e) {}
    }, TIME_LIMIT_MS);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', async (code) => {
      clearTimeout(to);
      const errorLines = parseErrorLines(language, stderr);
      await cleanupTemp(tempDir).catch(() => {});
      res.json({ stdout, stderr, exitCode: code, timedOut, errorLines });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// Parse error lines for editor decorations
function parseErrorLines(language, stderr) {
  const res = [];
  if (!stderr) return res;

  try {
    if (language === 'python') {
      const regex = /File ".*", line (\d+)(?:, in .*)?\n\s*(.*)/g;
      let m;
      while ((m = regex.exec(stderr)) !== null) {
        res.push({ line: parseInt(m[1], 10), message: m[2] || '' });
      }
    } else if (language === 'java') {
      const regex = /Main\.java:(\d+)/g;
      let m;
      while ((m = regex.exec(stderr)) !== null) {
        res.push({ line: parseInt(m[1], 10), message: 'Error at line ' + m[1] });
      }
    } else if (language === 'cpp') {
      const regex = /main\.cpp:(\d+):\d+: (.+)/g;
      let m;
      while ((m = regex.exec(stderr)) !== null) {
        res.push({ line: parseInt(m[1], 10), message: m[2] });
      }
    } else if (language === 'javascript') {
      const regex = /main\.js:(\d+):\d+/g;
      let m;
      while ((m = regex.exec(stderr)) !== null) {
        res.push({ line: parseInt(m[1], 10), message: 'Runtime error' });
      }
    }
  } catch (e) {}
  return res;
}

// Cleanup temp folder
async function cleanupTemp(dirPath) {
  if (!dirPath) return;
  try {
    if (fsSync.existsSync(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  } catch (e) {}
}

// Test route
app.get('/', (req, res) => res.json({ ok: true, msg: 'Code runner server' }));

app.listen(PORT, () => {
  console.log(`Code runner server listening at http://localhost:${PORT}`);
});

