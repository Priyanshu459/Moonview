const { spawn } = require('child_process');

const child = spawn('npx.cmd', ['prisma', 'migrate', 'dev', '--name', 'update_watch_progress_identity'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

child.stdin.write('y\n');
child.stdin.end();
