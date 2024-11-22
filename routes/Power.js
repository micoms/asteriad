/**
 * @fileoverview Handles container power management actions via Docker. This module defines routes
 * to start, stop, restart, pause, unpause, and kill Docker containers identified by their ID.
 * Each action is accessed through a POST request specifying the action as part of the URL. Utilizes
 * Dockerode to interface with the Docker API for performing these operations on specific containers.
 */

const express = require('express');
const router = express.Router();
const Docker = require('dockerode');

const docker = new Docker({ socketPath: process.env.dockerSocket });

/**
 * POST /:id/:power
 * Manages the power state of a Docker container based on the action specified in the URL. Supports actions
 * like start, stop, restart, pause, unpause, and kill. Each action is directly invoked on the container
 * object from Dockerode based on the specified container ID and action parameter. Responses include
 * success messages or error handling for invalid actions or execution failures.
 *
 * @param {Object} req - The HTTP request object, containing the container ID and the power action as URL parameters.
 * @param {Object} res - The HTTP response object used to return success or error messages.
 * @returns {Response} JSON response indicating the outcome of the action, either successful execution or an error.
 */
router.post('/instances/:id/:power', async (req, res) => {
    const { power } = req.params;
    const container = docker.getContainer(req.params.id);
    try {
        switch (power) {
            case 'start':
            case 'stop':
            case 'restart':
            case 'pause':
            case 'unpause':
            case 'kill':
                await container[power]();
                res.status(200).json({ message: `Container ${power}ed successfully` });
                break;
            default:
                res.status(400).json({ message: 'Invalid power action' });
        }
    } catch (err) {
        if (err.statusCode === 304) {
            res.status(304).json({ message: err.message });
        } else {
            res.status(500).json({ message: err.message });
        }
    }
});

/**
 * POST /instances/:id/script
 * Executes a script inside a container based on the egg configuration.
 */
router.post('/instances/:id/script', async (req, res) => {
    const container = docker.getContainer(req.params.id);
    const { script, name } = req.body;

    if (!script || !name) {
        return res.status(400).json({ message: 'Script and name are required' });
    }

    try {
        const exec = await container.exec({
            Cmd: ['sh', '-c', script],
            AttachStdout: true,
            AttachStderr: true,
            Tty: true
        });

        const stream = await exec.start();
        let output = '';

        stream.on('data', (chunk) => {
            output += chunk.toString();
        });

        stream.on('end', () => {
            res.status(200).json({ 
                message: `Script ${name} executed successfully`,
                output
            });
        });

        stream.on('error', (err) => {
            res.status(500).json({ 
                message: `Error executing script ${name}`,
                error: err.message
            });
        });
    } catch (err) {
        res.status(500).json({ 
            message: `Error executing script ${name}`,
            error: err.message
        });
    }
});

/**
 * POST /instances/:id/command
 * Executes a custom command inside a container based on the egg configuration.
 */
router.post('/instances/:id/command', async (req, res) => {
    const container = docker.getContainer(req.params.id);
    const { command, name } = req.body;

    if (!command || !name) {
        return res.status(400).json({ message: 'Command and name are required' });
    }

    try {
        const exec = await container.exec({
            Cmd: ['sh', '-c', command],
            AttachStdout: true,
            AttachStderr: true,
            Tty: true
        });

        const stream = await exec.start();
        let output = '';

        stream.on('data', (chunk) => {
            output += chunk.toString();
        });

        stream.on('end', () => {
            res.status(200).json({ 
                message: `Command ${name} executed successfully`,
                output
            });
        });

        stream.on('error', (err) => {
            res.status(500).json({ 
                message: `Error executing command ${name}`,
                error: err.message
            });
        });
    } catch (err) {
        res.status(500).json({ 
            message: `Error executing command ${name}`,
            error: err.message
        });
    }
});

module.exports = router;
