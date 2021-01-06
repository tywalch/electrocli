# ElectroCLI
![ElectroDB](https://github.com/tywalch/electrodb/blob/master/assets/electrodb-drk.png?raw=true)
Electro is a CLI utility toolbox for extending the functionality of the node library [ElectroDB](https://github.com/tywalch/electrodb) to the terminal. 

*This app is a work in progress, please submit issues/feedback or reach out on twitter [@tinkertamper](https://twitter.com/tinkertamper)*. 

# Features 
- Generate TypeScript definition files (`.d.ts`) for your ElectroDB `Entities` and `Services`

# Install
Install globally
```
npm install electrocli -g
```

# Usage
```
Usage:  [options] [command]

Electro is a CLI utility toolbox for extending the functionality of the node library ElectroDB to the terminal.

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  typedef [options] <filepath>  Specify a file that exports an ElectroDB Service or Entity and Electro CLI will automatically generate a typescript type definition file.
  add [options] <filepath>      Specify a file that exports an ElectroDB Service, Entity, or JSON Model. Electro will add that Instance to the CLI allowing it to be queried.
  remove|rm <service>           Remove existing ElectroDB Instance from the Electro CLI.
  list|ls                       List all ElectroDB Instances that have been imported into the Electro CLI.
  serve|rest <port> <port>      Stand up a local http endpoint based on your imported Instances.
  scan                          Execute scans against your imported Instances.
  query                         Execute queries against your imported Instances.
  help [command]                display help for command
```

# Commands
## typedef
```
Usage:  typedef [options] <filepath>

Specify a file that exports an ElectroDB Service or Entity and Electro CLI will automatically generate a typescript type definition file.

Options:
  -o, --output <filepath>  Specify an output filepath for the generated type definition file.
  -h, --help               display help for command
```
## add
```
Usage:  add [options] <filepath>

Specify a file that exports an ElectroDB Service, Entity, or JSON Model. Electro will add that Instance to the CLI allowing it to be queried.

Options:
  -l, --label <label>    Specify a custom label for this service to appear in the CLI. (default: Service/Entity name)
  -t, --table <table>    Specify a default table to use with this instance - Required for Models.
  -p, --params <params>  Specify JSON for custom DocumentClient configuration. If filepath exports a Service or Entity this configuration will overwrite any client specified on that instance.
  -o, --overwrite        Overwrite existing tag if already exists
  -h, --help             display help for command
```
## remove
```
Usage:  remove|rm [options] <service>

Remove existing ElectroDB Instance from the Electro CLI.

Options:
  -h, --help  display help for command
```
## list
```
Usage:  list|ls [options]

List all ElectroDB Instances that have been imported into the Electro CLI.

Options:
  -h, --help  display help for command
```
## serve
```
Usage:  serve|rest <port> [options] <port>

Stand up a local http endpoint based on your imported Instances.

Options:
  -h, --help  display help for command
```
## scan
```
Usage:  scan [options] [command]

Execute scans against your imported Instances.

Options:
  -h, --help      display help for command

Commands:
  taskapp
  help [command]  display help for command
```
## query
```
Usage:  query [options] [command]

Execute queries against your imported Instances.

Options:
  -h, --help      display help for command

Commands:
  taskapp
  help [command]  display help for command
```

# Examples


## query
```electro query taskapp```
| Access Pattern | Command |
| -------------: | ------- |
| employee | `[options] <employee>` |
| coworkers | `[options] <office> [team] [title] [employee]` |
| teams | `[options] <team> [dateHired] [title]` |
| employeelookup | `[options] <employee>` |
| roles | `[options] <title> [salary]` |
| directreports | `[options] <manager> [team] [office]` |
| task | `[options] <task> [project] [employee]` |
| project | `[options] <project> [employee] [status]` |
| assigned | `[options] <employee> [project] [status]` |
| statuses | `[options] <status> [project] [employee]` |
| locations | `[options] <country> <state> [city] [zip] [office]` |
| office | `[options] <office>` |
| workplaces | `[options] <office> [team] [title] [employee]` |
| assignments | `[options] <employee>` |