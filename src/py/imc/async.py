from greenlet import greenlet

from imc import auth

gr_waitmap = {}
gr_main = greenlet.getcurrent()

def current():
    return greenlet.getcurrent()

def switchtop():
    global gr_main

    old_iden = auth.current_iden
    auth.current_iden = None

    result =  gr_main.switch(None)

    auth.current_iden = old_iden

    return result

def callee(f):
    def wrapper(*args,**kwargs):
        kwargs['_grid'] = str(id(greenlet.getcurrent()))
        return f(*args,**kwargs)

    return wrapper

def caller(f):
    def wrapper(*args,**kwargs):
        global gr_main
        global gr_waitmap

        def _call(*args,**kwargs):
            ret = f(*args,**kwargs)
            del gr_waitmap[grid]

            return (True,ret)
        
        try:
            gr = greenlet(_call)
            grid = str(id(gr))
            old_iden = auth.current_iden
            gr_waitmap[grid] = (gr,old_iden)

            result = gr.switch(*args,**kwargs)
            auth.current_iden = old_iden

            if result == None:
                return (False,None)

            if gr.dead == False:
                gr.parent = gr_main

            return result

        except Exception as err:
            print(err)
            return (False,'Einternal')

    return wrapper

def retcall(grid,result):
    global gr_waitmap

    try:
        gr,iden = gr_waitmap[grid]

        old_iden = auth.current_iden
        auth.current_iden = iden

        gr.switch(result)
        
        auth.current_iden = old_iden

    except Exception as err:
        print(err)
        pass
