export async function GET() {
  const response = await fetch('https://vipogroup.github.io/HOME/');
  const html = await response.text();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
  });
}
