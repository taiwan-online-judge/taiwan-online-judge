import sys
from importlib import import_module

mod_info = {}

def load(mod_name, mod_path, *args):
    if(
        mod_name in mod_info or
        mod_path in sys.modules
    ):
        raise NameError

    instance = import_module(mod_path, "")
    instance.load(*args)
    mod_info[mod_name] = [instance, args, mod_path]
    return instance

def reload(mod_name):
    instance, args, mod_path = mod_info[mod_name]
    instance = import_module(mod_path, "")
    instance.load(*args)
    mod_info[mod_name][0] = instance
    return instance


def unload(mod_name):
    instance, args, mod_path = mod_info[mod_name]
    instance.unload()
    del sys.modules[mod_path]
    del mod_info[mod_name]

def list_mod():
    print(list(mod_info.keys()))
