import sys
import re;
import importlib
from importlib import import_module
from importlib.abc import MetaPathFinder
import importlib.machinery

mod = sys.modules[__name__]
mod_list = {}

class ModFinder(MetaPathFinder):
    def find_module(fullname,path):
        if not fullname.startswith('/srv/'):
            return None

        return importlib.machinery.SourceFileLoader(fullname,fullname + '.py')

def load(name,path,*args):
    instance = import_module(path,'')
    mod_list[name] = instance
    setattr(mod,name,getattr(instance,name)(*args))

def unload(name):
    getattr(mod,name).unload()
    delattr(mod,name)
    del mod_list[name]

def load_sqmod(sqmodname):
    instance = import_module(''.join(['/srv/py/sqmod/',sqmodname,'/py/',sqmodname]))

    return getattr(instance,sqmodname)

def load_pmod(pmodname):
    instance = import_module(''.join(['/srv/http/toj/pmod/',pmodname,'/py/',pmodname]))

    return getattr(instance,pmodname)

sys.meta_path.append(ModFinder)
