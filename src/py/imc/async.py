import traceback
import uuid
import ssl

import tornado.stack_context
from Crypto.Hash import SHA512
from greenlet import greenlet

from imc import auth

gr_idmap = {}
ret_idmap = {}
gr_main = greenlet.getcurrent()

def switch_top():
    global gr_main

    assert greenlet.getcurrent() != gr_main

    old_iden = auth.current_iden
    old_contexts = tornado.stack_context._state.contexts
    auth.current_iden = None

    result =  gr_main.switch(None)

    tornado.stack_context._state.contexts = old_contexts
    auth.current_iden = old_iden

    return result

def caller(f):
    def wrapper(*args,**kwargs):
        global gr_main
        global gr_idmap
        global ret_idmap

        def _call(*args,**kwargs):
            ret = f(*args,**kwargs)
            retids = gr_idmap[grid]
            for retid in retids:
                del ret_idmap[retid] 

            del gr_idmap[grid]

            return (True,ret)
        
        try:
            gr = greenlet(_call)
            grid = id(gr)
            gr_idmap[grid] = set()
            old_iden = auth.current_iden
            old_contexts = tornado.stack_context._state.contexts

            result = gr.switch(*args,**kwargs)

            tornado.stack_context._state.contexts = old_contexts
            auth.current_iden = old_iden

            if result == None:
                return (False,None)

            if gr.dead == False:
                gr.parent = gr_main

            return result

        except TypeError as err:
            traceback.print_stack()
            print(err)
            return (False,'Eparameter')

        except Exception as err:
            traceback.print_stack()
            print(err)
            return (False,'Einternal')

    return wrapper

def get_retid():
    global gr_idmap
    global ret_idmap

    gr = greenlet.getcurrent()
    grid = id(gr)
    retid = SHA512.new(uuid.uuid1().bytes + ssl.RAND_bytes(64)).hexdigest()

    gr_idmap[grid].add(retid)
    ret_idmap[retid] = gr

    return retid

def ret(retid,value = None,err = None):
    global gr_main
    global gr_idmap
    global ret_idmap

    assert greenlet.getcurrent() == gr_main

    try:
        gr = ret_idmap.pop(retid)
        gr_idmap[id(gr)].remove(retid)

    except KeyError:
        return

    try:
        old_iden = auth.current_iden
        old_contexts = tornado.stack_context._state.contexts

        if err == None:
            gr.switch(value)
        
        else:
            gr.throw(err)

        tornado.stack_context._state.contexts = old_contexts
        auth.current_iden = old_iden

    except TypeError as err:
        traceback.print_stack()
        print(err)
