# Benchenario

![logo](logo.png)

This tool is used to benchmark successions of HTTP requests. Its syntax is inspired by the unfortunately abandoned [Drill](https://github.com/fcsonline/drill) (so an [Ansible](https://github.com/ansible/ansible)-like YAML syntax)

## Installation

Grab a pre-built binary from the [Release page](https://github.com/Webcretaire/Benchenario/releases), or run with Deno from source using `deno run -A main.ts [options]`

## Usage

Write a scenario in a YAML file (see syntax below, and examples in the `examples` folder), and then run using `benchenario my_file.yml` (or `deno run -A main.ts my_file.yml` if installed from sources)

### Variables support

In most string options, you can interpolate variables using a JS-like template syntax. The variables available are your environment variables as well as any HTTP response which was saved using the `assign` step parameter (see `Syntax` below). Additionally, you can use basic JS properties and operators to access string properties, sum variables, etc.

Example scenario using variables :

```yaml
steps:
  - name: First request (uses the USER environment variable)
    path: "/${USER}"
    assign: first_request_output # Saves the response to a variable

  - name: Second request (uses the first request's output as well as a few operations on variables)
    path: "/test"
    method: "POST"
    body: |
      {
        "user": "${USER}",
        "user_length": ${USER.length},
        "a_random_number": ${Math.random()},
        "last_status": "${first_request_output.status}",
        "last_content": ${first_request_output.content},
        "last_parsed_json_content": ${JSON.stringify(first_request_output.json)}
      }
```

## Syntax

### Scenario options

- **iterations** - *number* : Number of benchmarked iterations
- **warmup** - *number* : Number of warmup runs, executed before the benchmarked iterations start
- **baseUrl** - *string* : Root URL from which relative paths will be resolved
- **steps** - *array of Step structures* : List of operations to run (see options below)

### Step options

- **name** - *string* : Human readable description of the step
- **path** - *string* : Absolute or relative (according to scenario's `baseUrl`) path for the HTTP request's URL
- **method** - *string* : HTTP method to use (default = `GET`)
- **headers** - *Object (string keys, string values)* : List of headers to add to the request (values can use variables)
- **body** - *string | object | array* : Optional body for the request, if an object or array is specified it will be converted to JSON
- **assign** - *string* : Name of the variable in which the response's status and content will be saved (so you can re-use it in later requests)
- **waitBefore** - *number* : Specify a number in milliseconds to wait before sending the request
- **waitAfter** - *number* : Specify a number in milliseconds to wait after receiving the response