# Disboard Gateway Filter

A Tampermonkey userscript that filters out gateway servers from [Disboard](https://disboard.org) listings automatically using a community-maintained blocklist.

## But why?

Certain tags on disboard have been impossible to browse lately due to these gateway servers. When one server stops using gateways, 2 others pop up, shitting up the entire tag. Getting new members to your server organically through disboard has been basically rendered impossible by those who use gateways and autobumpers.

Disboard refuses to do anything about them. Their official policy is "If a server does not state in its listing that it's a gateway, we can't do anything about it", which is so dumb that even the owners who use gateway servers, regularly talk in their chats about how easy disboard is to abuse. 

## Features

- **Community blocklist** - Automatically fetches a human-verified list of known gateway servers and blocks them. 
- **Min / Max online users** - Filter servers by online member count
- **Hide new servers** - Optionally hide servers tagged as new
- **Only show rated servers** - Optionally show only servers with ratings
- **Manually hide servers** - Right-click any server's menu to permanently hide it from your results

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click the link below to install the script:

   **[Install Disboard Filters](https://raw.githubusercontent.com/agentjohn67/disboard-filters/main/script.user.js)**

3. Done! Tampermonkey might ask you about loading the blocklist from github, just press allow.

## Contributing

Firstly, please go to [Disboard's official discord server](https://discord.com/invite/DXmqpVMXCg) and express your dissatisfaction with the gateway problem. If more people complain about it, maybe we can get a native solution from the owner.

If you've found a gateway server that isn't on the list, feel free to add me on discord (@agentjohn67) and send me the disboard listing.

## License

[GPL 3.0](https://github.com/agentjohn67/disboard-filter/blob/main/LICENSE)
