import types
from greenlet import greenlet

gr_waitmap = {}

gr_main = greenlet.getcurrent()

def current():
    return greenlet.getcurrent()

def switchtop():
    global gr_main

    return gr_main.switch(None)

def callee(f):
    def wrapper(*args,**kwargs):
        kwargs['_grid'] = str(id(greenlet.getcurrent()))
        return f(*args,**kwargs)

    return wrapper

def caller(f):
    def wrapper(*args,**kwargs):
        global gr_waitmap

        try:
            gr = greenlet(lambda *args,**kwargs : (str(id(greenlet.getcurrent())),f(*args,**kwargs)))
            grid = str(id(gr))
            gr_waitmap[grid] = gr

            result = gr.switch(*args,**kwargs)
            if result == None:
                return (False,None)

            ret_grid,ret = result
            del gr_waitmap[grid]

            if greenlet.getcurrent() == gr_main:
                return (False,None)

            else:
                while ret_grid != grid:
                    ret_grid,ret = gr_main.switch()

                return (True,ret)

        except Exception:
            return (False,'Einternal')

    return wrapper

def retcall(grid,value):
    global gr_waitmap

    try:
        gr = gr_waitmap[grid]
        gr.switch(value)

    except Exception:
        pass
