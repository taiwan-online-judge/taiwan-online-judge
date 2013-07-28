import datetime

def isoptime(time):
    try:
        if time[-1] == 'Z':
            return datetime.datetime.strptime(time,'%Y-%m-%dT%H:%M:%S.%fZ') 

        else:
            return datetime.datetime.strptime(time,'%Y-%m-%dT%H:%M:%S.%f') 

    except ValueError:
        return None
