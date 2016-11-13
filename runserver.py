#!/usr/bin/env python
import os
import asyncio
from aiohttp.web import Application, run_app
from server import views


CLIENT_FOLDER = os.path.join(os.path.dirname(__file__), 'client')


async def on_shutdown(app):
    for ws in app['sockets']:
        await ws.close()


async def init(loop):
    app = Application(loop=loop)
    app['sockets'] = []
    app['client_folder'] = CLIENT_FOLDER
    app.router.add_get('/', views.index)
    app.router.add_get('/ws', views.wshandler)
    app.router.add_static('/dist', os.path.join(CLIENT_FOLDER, 'dist'))
    app.on_shutdown.append(on_shutdown)
    return app


loop = asyncio.get_event_loop()
app = loop.run_until_complete(init(loop))
run_app(app, shutdown_timeout=1.5)
