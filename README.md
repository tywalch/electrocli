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

## TaskApp
TaskApp is a simple three Entity service that tracks Organizations, Employees, and Tasks. 

### Setup

#### Install ElectroCLI Globally
Install `electrocli` via npm globally. Note: This may require `sudo` or administrator privileges.
```
$> npm install electrocli --global
```

#### Clone/Download Examples
Clone the [electrodb](https://github.com/tywalch/electrodb) repository and then navigate to the the TaskApp example.
```
$> git clone https://github.com/tywalch/electrodb.git
$> cd electrodb/examples/taskapp
```
----
#### Configure your DynamoDB Target
It is recommended that you use the `dynamodb-local` docker image. 
```
$> docker pull amazon/dynamodb-local
$> docker run -p 8000:8000 amazon/dynamodb-local
```
>  More information on how to setup and configure that [here](https://hub.docker.com/r/amazon/dynamodb-local).

If you want to use your own DynamoDB instance in AWS (be careful with incurring fees) you can modify the `client.js` file located in the electrodb directory from above: `electrodb/examples/taskapp/lib/client.js`.  

----
#### Load the database
Records can be loaded into the example table by executing the file `electrodb/examples/taskapp/bin/load.js`. You will be prompted to confirm loading by typing `y`.
```
$> node electrodb/examples/taskapp/bin/load.js
   Your configuration is pointed to a local instance of dynamodb. This operation will create a table named 'electro' and then load 500 Employees and 600 Tasks records. Are you sure you want to proceed? y/N
$> y
```  
----
#### Add the "Taskr" Service to electro cli 
Use the `add` command to add the `taskr.js` within the `electrodb/examples/src` directory.
```
$> electro add electrodb/examples/src/taskr.js
```


### Query TaskApp 
```
$> electro query taskapp
```
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

### Serve CRUD HTTP Server for TaskApp
```
$> electro serve 8080
```
|  Method  | Endpoint |
| -------: | -------- |
|    GET | `http://localhost:8080/taskapp/employee/:employee` |
|    GET | `http://localhost:8080/taskapp/coworkers/:office` |
|    GET | `http://localhost:8080/taskapp/coworkers/:office/:team` |
|    GET | `http://localhost:8080/taskapp/coworkers/:office/:team/:title` |
|    GET | `http://localhost:8080/taskapp/coworkers/:office/:team/:title/:employee` |
|    GET | `http://localhost:8080/taskapp/teams/:team` |
|    GET | `http://localhost:8080/taskapp/teams/:team/:dateHired` |
|    GET | `http://localhost:8080/taskapp/teams/:team/:dateHired/:title` |
|    GET | `http://localhost:8080/taskapp/employeelookup/:employee` |
|    GET | `http://localhost:8080/taskapp/roles/:title` |
|    GET | `http://localhost:8080/taskapp/roles/:title/:salary` |
|    GET | `http://localhost:8080/taskapp/directreports/:manager` |
|    GET | `http://localhost:8080/taskapp/directreports/:manager/:team` |
|    GET | `http://localhost:8080/taskapp/directreports/:manager/:team/:office` |
|    GET | `http://localhost:8080/taskapp/task/:task` |
|    GET | `http://localhost:8080/taskapp/task/:task/:project` |
|    GET | `http://localhost:8080/taskapp/task/:task/:project/:employee` |
|    GET | `http://localhost:8080/taskapp/project/:project` |
|    GET | `http://localhost:8080/taskapp/project/:project/:employee` |
|    GET | `http://localhost:8080/taskapp/project/:project/:employee/:status` |
|    GET | `http://localhost:8080/taskapp/assigned/:employee` |
|    GET | `http://localhost:8080/taskapp/assigned/:employee/:project` |
|    GET | `http://localhost:8080/taskapp/assigned/:employee/:project/:status` |
|    GET | `http://localhost:8080/taskapp/statuses/:status` |
|    GET | `http://localhost:8080/taskapp/statuses/:status/:project` |
|    GET | `http://localhost:8080/taskapp/statuses/:status/:project/:employee` |
|    GET | `http://localhost:8080/taskapp/locations/:country/:state` |
|    GET | `http://localhost:8080/taskapp/locations/:country/:state/:city` |
|    GET | `http://localhost:8080/taskapp/locations/:country/:state/:city/:zip` |
|    GET | `http://localhost:8080/taskapp/locations/:country/:state/:city/:zip/:office` |
|    GET | `http://localhost:8080/taskapp/office/:office` |
|    GET | `http://localhost:8080/taskapp/workplaces/:office` |
|    GET | `http://localhost:8080/taskapp/workplaces/:office/:team` |
|    GET | `http://localhost:8080/taskapp/workplaces/:office/:team/:title` |
|    GET | `http://localhost:8080/taskapp/workplaces/:office/:team/:title/:employee` |
|    GET | `http://localhost:8080/taskapp/assignments/:employee` |
|   POST | `http://localhost:8080/taskapp/employee` |
|   POST | `http://localhost:8080/taskapp/task` |
|   POST | `http://localhost:8080/taskapp/locations` |
|    PUT | `http://localhost:8080/taskapp/employee/:employee` |
|    PUT | `http://localhost:8080/taskapp/task/:task/:project/:employee` |
|    PUT | `http://localhost:8080/taskapp/locations/:country/:state/:city/:zip/:office` |
| DELETE | `http://localhost:8080/taskapp/employee/:employee` |
| DELETE | `http://localhost:8080/taskapp/task/:task/:project/:employee` |
| DELETE | `http://localhost:8080/taskapp/locations/:country/:state/:city/:zip/:office` |