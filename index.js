const http = require('http');

const art = `
 ██████╗ ██████╗ ██╗   ██╗███╗   ██╗████████╗██╗███╗   ██╗ ██████╗ 
██╔════╝██╔═══██╗██║   ██║████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝ 
██║     ██║   ██║██║   ██║██╔██╗ ██║   ██║   ██║██╔██╗ ██║██║  ███╗
██║     ██║   ██║██║   ██║██║╚██╗██║   ██║   ██║██║╚██╗██║██║   ██║
╚██████╗╚██████╔╝╚██████╔╝██║ ╚████║   ██║   ██║██║ ╚████║╚██████╔╝
 ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝
                                                                      
██████╗ ██╗██╗  ██╗███████╗██╗     ███████╗                         
██╔══██╗██║╚██╗██╔╝██╔════╝██║     ██╔════╝                         
██████╔╝██║ ╚███╔╝ █████╗  ██║     ███████╗                         
██╔═══╝ ██║ ██╔██╗ ██╔══╝  ██║     ╚════██║                         
██║     ██║██╔╝ ██╗███████╗███████╗███████║                         
╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝                         
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counting Pixels</title>
  <style>
    body {
      background: #0a0a0a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      font-family: monospace;
    }
    pre {
      color: #00ff41;
      font-size: clamp(6px, 1.2vw, 14px);
      line-height: 1.2;
      text-shadow: 0 0 8px #00ff41, 0 0 20px #00ff41;
      animation: flicker 3s infinite;
      white-space: pre;
    }
    @keyframes flicker {
      0%, 95%, 100% { opacity: 1; }
      96% { opacity: 0.8; }
      98% { opacity: 0.9; }
    }
  </style>
</head>
<body>
  <pre>${art}</pre>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
