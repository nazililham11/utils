import os
import asyncio
import yaml
import genshin  # doc https://thesadru.github.io/genshin.py
from datetime import datetime, timedelta

GAME_GI = "GI"
GAME_HI3 = "HI3"
GAME_HSR = "HSR"

GENSHIN_HEADERS = [
    ("label", 10),
    ("resin", 8),
    ("daily", 6),
    ("expeditions", 12),
    ("weekly", 7),
    ("teapot", 10),
    ("spiral abyss", 23),
    ("prev spiral abyss", 23),
]

STARRAIL_HEADERS = [
    ("label", 10),
    ("stamina", 8),
    ("daily", 8),
    ("weekly", 7),
    ("sim universe", 13),
    ("memory of chaos", 45),
    ("pure fiction", 45),
]

DAILY_REWARD_HEADERS = [
    ("game", 4),
    ("uid", 10),
    ("label", 7),
    ("days", 5),
    ("signed in", 10),
    ("result", 16),
]

class Table:
    def __init__(self, headers, gap = 2):
        self.headers = []
        self.row_width = []
        self.gap = gap
        for _header in headers:
            self.headers.append(_header[0])
            self.row_width.append(_header[1])
        self.total_width = sum(self.row_width)
    
    def print_row(self, content):
        row = ""
        total_width = 0
        for _index, _col in enumerate(content):
            total_width += self.row_width[_index]
            row = (row + str(_col)).ljust(total_width, " ")
            row = row[:total_width] + (" " * self.gap)
            total_width += self.gap
        print(row)

    def print_separator(self):
        separator = ""
        for _index in range(len(self.headers)):
            separator += "-" * self.row_width[_index]
            separator += " " * self.gap
        print(separator)

    def print_header(self):
        self.print_row(self.headers)
        self.print_separator()


def load_yaml(filePath):
    with open(filePath) as stream:
        try:
            return yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            print(exc)


async def claim_reward(account, game):

    client = genshin.Client(account)

    if game == GAME_GI and GAME_GI in account["game"]:
        client.default_game = genshin.Game.GENSHIN
        uid = account["gi_uid"] if "gi_uid" in account else None
    elif game == GAME_HI3 and GAME_HI3 in account["game"]:
        client.default_game = genshin.Game.HONKAI
        uid = None
    elif game == GAME_HSR and GAME_HSR in account["game"]:
        client.default_game = genshin.Game.STARRAIL
        uid = account["hsr_uid"] if "hsr_uid" in account else None
    else:
        return
    

    try:
        reward = await client.claim_daily_reward()
    except genshin.AlreadyClaimed:
        result = "Today:Claimed"
    except Exception:
        result = "Unknown Error"
    else:
        result = f"Today:Claim {reward.amount}x \n{reward.name}"
    
    try:
        signed_in, days_claimed = await client.get_reward_info()
    except Exception as e:
        print("Error Occurred : ", e)
        return

    if uid is None:
        client.uids.get(client.default_game)
        uid = client.uid

    return uid, result, signed_in, days_claimed


async def genshin_data(account):

    gi_notes = None 
    gi_abyss = None
    gi_prev_abyss = None
    uid = None

    if GAME_GI not in account["game"]: 
        return

    try:
        client = genshin.Client(account)
        client.default_game = genshin.Game.GENSHIN

        gi_notes = await client.get_notes()

        client.uids.get(genshin.Game.GENSHIN)
        uid = client.uid

        if uid is not None:
            gi_abyss       = await client.get_spiral_abyss(uid)
            gi_prev_abyss  = await client.get_spiral_abyss(uid, previous=True)

    except Exception as e:
        print("Error Occurred : ", e)
        return
    
    label   = account["label"]
    resin   = f"{gi_notes.current_resin}/{gi_notes.max_resin}"
    weekly  = f"{gi_notes.remaining_resin_discounts}/{gi_notes.max_resin_discounts}"
    teapot  = f"{gi_notes.current_realm_currency}/{gi_notes.max_realm_currency}"
    abyss   = " - "
    prev_abyss = " - "

    if not gi_notes.claimed_commission_reward:
        daily = f"{gi_notes.completed_commissions}/{gi_notes.max_commissions}"
    else:
        daily = "Done"

    if uid is not None:
        if gi_abyss.total_battles > 0:
            abyss = f"{gi_abyss.max_floor}({gi_abyss.total_stars})"
            abyss = abyss + f" - {gi_abyss.total_battles} Battle"    
        if gi_prev_abyss.total_battles > 0:
            prev_abyss = f"{gi_prev_abyss.max_floor}({gi_prev_abyss.total_stars})"
            prev_abyss = prev_abyss + f" - {gi_prev_abyss.total_battles} Battle"

    max_expedition = None
    for exped in gi_notes.expeditions:
        if (
            max_expedition is None or 
            exped.remaining_time.total_seconds() > max_expedition.total_seconds()
        ):
            max_expedition = exped.remaining_time
    if isinstance(max_expedition, timedelta):
        if max_expedition.total_seconds() > 0:
            max_expedition = str(exped.remaining_time)[0:-3]
        else:
            max_expedition = "All Done"
    else:
        max_expedition = " - "

    account["gi_uid"] = uid

    return [label, resin, daily, max_expedition, weekly, teapot, abyss, prev_abyss]


async def starrail_data(account):

    if GAME_HSR not in account["game"]:
        return

    try:
        client = genshin.Client(account)
        client.default_game = genshin.Game.STARRAIL
        client.uids.get(genshin.Game.STARRAIL)

        hsr_challange = await client.get_starrail_challenge()
        hsr_notes     = await client.get_starrail_notes()
        hsr_pf        = await client.get_starrail_pure_fiction()
        
    except Exception as e:
        print("Error Occurred : ", e)
        return

    uid          = client.uid
    label        = account["label"]
    stamina      = f"{hsr_notes.current_stamina}/{hsr_notes.max_stamina}"
    daily        = f"{hsr_notes.current_train_score}/{hsr_notes.max_train_score}"
    weekly       = f"{hsr_notes.remaining_weekly_discounts}/{hsr_notes.max_weekly_discounts}"
    sim_universe = f"{hsr_notes.current_rogue_score}/{hsr_notes.max_rogue_score}"
    moc          = f"{hsr_challange.max_floor}({hsr_challange.total_stars})"
    moc          = moc + f" - {hsr_challange.total_battles} Battle"
    pure_fiction = f"{hsr_pf.max_floor}({hsr_pf.total_stars}) - {hsr_pf.total_battles} Battle"

    account["hsr_uid"] = uid

    return [label, stamina, daily, weekly, sim_universe, moc, pure_fiction]


async def print_genshin_table(accounts):
    gi_table = Table(GENSHIN_HEADERS)
    gi_table.print_header()

    for _account in accounts:
        accounts[_account] = { **accounts[_account], "label": _account }
        data = await genshin_data(accounts[_account])
        if data is not None:
            gi_table.print_row(data)

    gi_table.print_separator()
    print()  # newline
    print()  # newline


async def print_starrail_table(accounts):
    hsr_table = Table(STARRAIL_HEADERS)
    hsr_table.print_header()

    for _account in accounts:
        accounts[_account] = { **accounts[_account], "label": _account }
        data = await starrail_data(accounts[_account])
        if data is not None:
            hsr_table.print_row(data)
    
    hsr_table.print_separator()
    print()  # newline
    print()  # newline


async def claim_all_rewards(accounts):
    reward_table = Table(DAILY_REWARD_HEADERS)
    reward_table.print_header()
    
    for game in [GAME_GI, GAME_HI3, GAME_HSR]:
        for label in accounts:
            account = accounts[label]
            if game not in account["game"]:
                continue
            claim_result = await claim_reward(account, game)
            if not isinstance(claim_result, tuple):
                continue
            uid, result, signed_in, days_claimed = claim_result
            reward_table.print_row([game, uid, label, days_claimed, signed_in, result])
    
    reward_table.print_separator()
    print()  # newline
    print()  # newline
        

async def main():

    window_width = max(
        sum([x[1] for x in GENSHIN_HEADERS]) + 2 * len(GENSHIN_HEADERS),
        sum([x[1] for x in STARRAIL_HEADERS]) + 2 * len(STARRAIL_HEADERS),
        sum([x[1] for x in DAILY_REWARD_HEADERS]) + 2 * len(DAILY_REWARD_HEADERS),
    )
    os.system("cls")
    os.system(f"mode con: cols={window_width} lines=78")
    
    accounts = load_yaml('data.yaml')

    if accounts is not None:    
        print(f"{len(accounts)} Accounts loaded")

        current_time = datetime.now().strftime('%A,%d %M  %H:%M:%S')
        print("Update at ", current_time)
        print()  # newline
        print()  # newline

        await print_genshin_table(accounts)
        await print_starrail_table(accounts)
        await claim_all_rewards(accounts)
    
    exit()

asyncio.run(main())
