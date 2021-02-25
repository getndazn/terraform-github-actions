import * as core from '@actions/core';
import * as shell from 'shelljs';

async function setVersion() {
    const version = core.getInput('version')
    if (version == "") {
        throw new Error(`version input parmater was not set`)
    }
    if (shell.exec('tfenv install ' + version).code !== 0) {
        throw new Error(`unable to install terraform ` + version)
    }
    if (shell.exec('tfenv use ' + version).code !== 0) {
        throw new Error(`unable to set terraform ` + version)
    }
}

async function setWorkDir() {
        let workDir = core.getInput('working_directory')

        if (shell.ls(workDir).code !== 0) {
            throw new Error(`working directory ` + workDir + ` doesn't exist`)
        }

        //parallelism
        const parallelism = core.getInput('parallelism')

        if (parallelism !== "") {
            if (shell.mkdir('-p', '_tf/' + parallelism).code !== 0) {
                throw new Error(``)
            }
            if (shell.cp('-R', workDir + '/*', '_tf/' + parallelism + '/').code !== 0) {
                throw new Error(``)
            }
            workDir = '_tf/' + parallelism
        }

        shell.cd(workDir);
}

async function execTerraform() {
        // TF format
        if (shell.exec('terraform fmt -check').code !== 0) {
            throw new Error(`unable to format terraform`)
        }

        // TF init
        const backendConfig = core.getInput('backend_config')

        if (backendConfig) {
            if (shell.exec('terraform init -backend-config=' + backendConfig).code !== 0) {
                throw new Error(`unable to initilize terraform`)
            }
        } else {
            if (shell.exec('terraform init').code !== 0) {
                throw new Error(`unable to initilize terraform`)
            }
        }

        // TF validation
        if (shell.exec('terraform validate').code !== 0) {
            throw new Error(`unable to validate terraform`)
        }

        const plan = core.getInput('plan')
        const apply = core.getInput('apply')
        const destroy = core.getInput('destroy')

        const varFile = core.getInput('var_file')

        // TF destroy
        if (destroy) {
            if (varFile) {
                if (shell.exec(`terraform destroy -var-file='${varFile}' --auto-approve`).code !== 0) {
                    throw new Error(`unable to destroy terraform`)
                }
            }
            else {
                if (shell.exec('terraform destroy --auto-approve').code !== 0) {
                    throw new Error(`unable to destroy terraform`)
                }
            }
        }

        // TF plan
        if (plan || apply) {
            if (varFile) {
                if (shell.exec(`terraform plan -var-file='${varFile}' -out=tfplan.out`).code !== 0) {
                    throw new Error(`unable to plan terraform`)
                }
            }
            else {
                if (shell.exec('terraform plan -out=tfplan.out').code !== 0) {
                    throw new Error(`unable to plan terraform`)
                }
            }
        }

        // TF apply
        if (apply) {
            if (shell.exec('terraform apply tfplan.out').code !== 0) {
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
