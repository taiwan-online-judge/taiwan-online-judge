import types

gen_current_id = None
gen_waitmap = {}

def callee(f):
    def wrapper(*args,**kwargs):
        global gen_current_id
        global gen_waitmap

        kwargs['_genid'] = gen_current_id
        return f(*args,**kwargs)

    return wrapper

def caller(f):
    def wrapper(*args,**kwargs):
        global gen_current_id
        global gen_waitmap

        try:
            gen = f(*args,**kwargs)
            if isinstance(gen,types.GeneratorType):
                gen_current_id = str(id(gen))

                gen_waitmap[gen_current_id] = gen

                try:
                    next(gen)

                    return (False,gen_current_id)

                except StopIteration as ret:
                    del gen_waitmap[gen_current_id]
                    return (True,ret)


            else:
                return (True,gen)

        except Exception as err:
            return (True,'Einternal')

    return wrapper

def retcall(genid,value):
    global gen_current_id
    global gen_waitmap

    gen_current_id = genid
    try:
        gen = gen_waitmap[gen_current_id]
        gen.send(value)
    
        return (False,genid)

    except StopIteration as err:
        del gen_waitmap[genid]
        return (True,err.value)

    except KeyError as err:
        return (True,'Einternal')
