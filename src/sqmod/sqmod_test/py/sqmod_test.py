from tojauth import TOJAuth
from asyncdb import AsyncDB
import mod
import com
import config
import imc.async
from imc.proxy import Proxy
from square import Square

class sqmod_test(Square):
    _sqmod_name = 'sqmod_test'

    def __init__(self, mod_idendesc, get_link_fn, sqid):
        self._sqid = sqid;
        self._idendesc = mod_idendesc
        self.get_link = get_link_fn
        
        self._accessid = mod.SquareMg.get_accessid_by_sqid(self._sqid)

        self.db = AsyncDB(config.MOD_DBNAME, config.MOD_DBUSER, 
                          config.MOD_DBPASSWORD)

        self._reg_path = 'sq/' + str(self._sqid) + '/'

        Proxy.instance.register_call(
            self._reg_path,'list_jurank',self.list_jurank)
        Proxy.instance.register_call(
            self._reg_path,'update_result',self.update_result)

    def unload(self):
        pass

    def join_square(self,uid):
        return mod.SquareMg.JOIN_ACCEPT

    def quit_square(self,uid):
        pass

    @staticmethod
    def create_square_data():
        pass
    
    @staticmethod
    def delete_square_data():
        pass


    @imc.async.caller
    def list_jurank(self):
        #TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_READ)

        cur = self.db.cursor();
        cur.execute('SELECT "name","song","score","maxcombo" FROM "SQMOD_TEST_JURANK" ORDER BY "score" DESC')

        ret = []
        for data in cur:
            ret.append({
                'name':data[0],
                'song':data[1],
                'score':data[2],
                'maxcombo':data[3],
            })

        return ret

    @imc.async.caller
    def update_result(self,name,song,score,maxcombo):
        #TOJAuth.check_access_func(self._accessid, TOJAuth.ACCESS_READ)

        cur = self.db.cursor();
        cur.execute('SELECT "score" FROM "SQMOD_TEST_JURANK" WHERE "name"=%s AND "song"=%s',
                    (name,song))

        if cur.rowcount == 1:
            if cur.fetchone()[0] > score:
                return 'Success'

        cur.upsert('SQMOD_TEST_JURANK',
                   {'name':name,'song':song},
                   {'score':score,'maxcombo':maxcombo})

        client_links = self.get_link('client')
        subpath = 'sq/' + str(self._sqid) + '/'
        for link in client_links:
            Proxy.instance.call_async(
                link + subpath, 'update_jurank', 10000, None)

        return 'Success'
