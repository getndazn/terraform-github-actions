import * as shell from 'shelljs'
import * as core from '@actions/core'

async function setVersion() {
    const version = core.getInput('version')

    if (!version) {
        throw new Error(`version input parmater was not set`)
    }
    if (shell.exec(`tfenv install ${version}`).code) {
        throw new Error(`unable to install terraform ${version}`)
    }
    if (shell.exec(`tfenv use ${version}`).code) {
        throw new Error(`unable to set terraform ${version}`)
    }
}

async function setWorkDir() {
    const parallelism = core.getInput('parallelism')
    let workDir = core.getInput('working_directory')

    if (shell.ls(workDir).code) {
        throw new Error(`working directory ${workDir} doesn't exist`)
    }

    if (parallelism) {
        if (shell.mkdir('-p', `_tf/${parallelism}`).code) {
            throw new Error()
        }
        if (shell.cp('-R', `${workDir}/*`, `_tf/${parallelism}/`).code) {
            throw new Error()
        }
        workDir = `_tf/${parallelism}`
    }

    shell.cd(workDir);
}

async function execTerraform() {
    // GHA inputs
    const plan = core.getInput('plan')
    const apply = core.getInput('apply')
    const destroy = core.getInput('destroy')
    const varFile = core.getInput('var_file')
    const destroyTarget = core.getInput('destroy_target')
    const backendConfig = core.getInput('backend_config')

    // Optional TF params
    const varFileParam = varFile ? `-var-file=${varFile}` : ''
    const destroyTargetParam = destroyTarget ? `-target=${destroyTarget}` : ''
    const backendConfigParam = backendConfig ? `-backend-config=${backendConfig}` : ''

    // TF format
    if (shell.exec('terraform fmt -check').code) {
        throw new Error(`unable to format terraform`)
    }

    // TF init
    if (shell.exec(`terraform init ${backendConfigParam}`).code) {
        throw new Error(`unable to initilize terraform`)
    }

    // TF validation
    if (shell.exec('terraform validate').code) {
        throw new Error(`unable to validate terraform`)
    }

    // TF destroy
    if (destroy) {
        if (destroyTarget) {
            if (shell.exec(`terraform destroy ${varFileParam} --auto-approve ${destroyTargetParam}`).code) {
                throw new Error(`unable to destroy terraform`)
            }
        }

        if (shell.exec(`terraform destroy ${varFileParam} --auto-approve`).code) {
            throw new Error(`unable to destroy terraform`)
        }
    }

    // TF plan
    if (plan || apply) {
        if (shell.exec(`terraform plan ${varFileParam} -out=tfplan.out`).code) {
            throw new Error(`unable to plan terraform`)
        }
    }

    // TF apply
    if (apply) {
        if (shell.exec('terraform apply tfplan.out').code) {
            throw new Error(`unable to apply terraform`)
        }
    }
}

async function run() {
    try {
        await setVersion()
        await setWorkDir()
        await execTerraform()
    }
    catch (error) {
        core.setFailed(error.message)
    }
}

run()
