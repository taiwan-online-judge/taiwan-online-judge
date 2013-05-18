from imc.auth import Auth

class TOJAuth(Auth):
    def __init__(self,pubkey,privkey = None):
        super().__init__()

        self.set_verifykey(pubkey)
        if privkey != None:
            self.set_signkey(privkey)

        TOJAuth.instance = self

    def create_iden(self,linkclass,linkid):
        iden = {
            'linkclass':linkclass,
            'linkid':linkid
        }
        return self.sign_iden(iden)

    def get_iden(self,conn_linkclass,conn_linkid,idendesc):
        iden = super().get_iden(idendesc) 
        if iden == None:
            return None

        if conn_linkclass == 'client' and conn_linkid != iden['linkid']:
            return None

        return iden
