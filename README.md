# ElectroCLI

## Install
Install globally
```
npm install electrocli -g
```

## Usage
```
electro [options] [command]

Electro is a CLI utility toolbox for extending the functionality of the node library ElectroDB to the terminal.

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  typedef [options] <filepath>  Specify a file that exports an ElectroDB Service or Entity and Electro will automatically generate a typescript type definition file.
  add [options] <filepath>      Specify a file that exports an ElectroDB Service or Entity and Electro will add that Instance to the CLI
  remove|rm <service>           Remove references added to the Electro CLI
  list|ls                       List all ElectroDB instances that have been imported into the Electro cli
  serve <port>                  Stand up a local http endpoint based on your models
  scan                          Scan for local instances that have been added to the CLI
  query                         Query local instances that have been added to the CLI
  help [command]                display help for command
```
