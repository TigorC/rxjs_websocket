import os
import json
from aiohttp.web import WebSocketResponse, WSMsgType, Response


def encode_msg(msg_data):
    return json.dumps(msg_data)


async def index(request):
    index_path = os.path.join(request.app['client_folder'], 'index.html')
    with open(index_path, 'rb') as fp:
        return Response(body=fp.read(), content_type='text/html')


async def wshandler(request):
    resp = WebSocketResponse()
    await resp.prepare(request)
    user_id = request.rel_url.query.get('uid')
    try:
        print('{0} joined.'.format(user_id))
        for ws in request.app['sockets']:
            ws.send_str(encode_msg('"{0}" joined'.format(user_id)))
        request.app['sockets'].append(resp)

        async for msg in resp:
            print(msg.data)
            if msg.type == WSMsgType.TEXT:
                for ws in request.app['sockets']:
                    ws.send_str(msg.data)
            else:
                return resp
        return resp

    finally:
        request.app['sockets'].remove(resp)
        print('Someone disconnected.')
        for ws in request.app['sockets']:
            if not ws.closed:
                ws.send_str(encode_msg('{0} disconnected.'.format(user_id)))
