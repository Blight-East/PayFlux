
export async function GET() {
    return new Response('google-site-verification: googlec9febe29141cc19f.html', {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
    });
}
