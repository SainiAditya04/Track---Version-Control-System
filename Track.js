#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { diffLines } from "diff";
import chalk from "chalk";
import { Command } from "commander";

const program = new Command();

class Track{
    constructor(repositoryPath = '.'){
        this.repositoryPath = path.join(repositoryPath, '.track'); // this will create .track
        this.objectsPath = path.join(this.repositoryPath, 'objects'); // .track/objects
        this.headPath = path.join(this.repositoryPath, 'HEAD'); // .track/HEAD
        this.indexPath = path.join(this.repositoryPath, 'index'); // .track/index
        this.init();
    }

    async init(){
        await fs.mkdir(this.objectsPath, { recursive: true });
        try {
            await fs.writeFile(this.headPath, '', { flag: 'wx' }); // w for writing, fails if file already exists
            
            await fs.writeFile(this.indexPath, JSON.stringify([ ]), { flag: 'wx' });
        }
        catch (error) {
            console.log("Already initialized the .track folder");
        }
    }

    hashObject(content){
        return crypto.createHash('sha1').update(content, 'utf-8').digest('hex');
    }

    async add(fileToBeAdded){
        const fileData = await fs.readFile(fileToBeAdded, { encoding: 'utf-8' }); // read the content of file
        const fileHash = this.hashObject(fileData); // now hash the file
        console.log(fileHash);
        const newFileHashedObjectPath = path.join(this.objectsPath, fileHash); // .track/objects/99dffhaf984...
        await fs.writeFile(newFileHashedObjectPath, fileData);
        await this.updateStagingArea(fileToBeAdded, fileHash);
        console.log(`Added ${fileToBeAdded}`);
    }

    async updateStagingArea(filePath, fileHash){
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' })); // read the index
        index.push({ path: filePath, hash: fileHash }); // add the file to the index
        await fs.writeFile(this.indexPath, JSON.stringify(index));
    }

    async commit(message){
        const index = JSON.parse(await fs.readFile(this.indexPath, { encoding: 'utf-8' }));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            timeStamp: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit
        };

        const commitHash = this.hashObject(JSON.stringify(commitData));
        const commitPath = path.join(this.objectsPath, commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));
        // now update the HEAD to point to the new commit we made
        await fs.writeFile(this.headPath, commitHash);
        // also clear the staging area now,
        await fs.writeFile(this.indexPath, JSON.stringify([ ]));

        console.log(`commit successfully created ${commitHash}`);
    }

    async getCurrentHead(){
        try{
            return await fs.readFile(this.headPath, { encoding: 'utf-8' });
        }catch(error){
            return null;
        }
    }

    async log(){
        let currentCommitHash = await this.getCurrentHead();
        while(currentCommitHash){
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath, currentCommitHash), { encoding: 'utf-8' }));

            console.log(`---------------------------------------\n`);
            console.log(`Commit: ${currentCommitHash}\nDate: ${commitData.timeStamp}\n\n${commitData.message}`);

            currentCommitHash = commitData.parent;
        }
    }

    async showCommitDiff(commitHash){
        const commitData = JSON.parse(await this.getCommitData(commitHash));
        if(!commitData){
            console.log("Commit not found!");
            return;
        }

        console.log("Changes in the last commit are: ");

        for(const file of commitData.files){
            console.log(`File: ${file.path}`);
            const fileContent = await this.getFileContent(file.hash);
            console.log(fileContent);

            if(commitData.parent){
                // get the data of parent commit 
                const parentCommitData = JSON.parse(await this.getCommitData(commitData.parent));
                const getParentFileContent = await this.getParentFileContent(parentCommitData, file.path);
                if(getParentFileContent !== undefined){
                    console.log('\nDiff: ');
                    const diff = diffLines(getParentFileContent, fileContent);

                    // console.log(diff);

                    diff.forEach(part => {
                        if(part.added){
                            process.stdout.write(chalk.green("++" + part.value));
                        }
                        else if(part.removed){
                            process.stdout.write(chalk.red("--" + part.value));
                        }
                        else{
                            process.stdout.write(chalk.grey(part.value));
                        }
                    });
                    console.log(); // to get a new line
                }
                else{
                    console.log("New file in this commit");
                }
            }
            else{
                console.log("First commit");
            }
        }
    }

    async getParentFileContent(parentCommitData, filePath){
        const parentFile = parentCommitData.files.find(file => file.path === filePath);
        if(parentFile){
            // get the file content from the parent commit and return the content
            return await this.getFileContent(parentFile.hash);
        }
    }

    async getCommitData(commitHash){
        const commitPath = path.join(this.objectsPath, commitHash);
        try{ 
            return await fs.readFile(commitPath, { encoding: 'utf-8' });
        }
        catch(error){
            console.log("failed to read the commit data!");
            return null;
        }
    }

    async getFileContent(fileHash){
        const objectPath = path.join(this.objectsPath, fileHash);
        //
        return await fs.readFile(objectPath, { encoding: 'utf-8' });
    }

}

// (async () => {
//     const track = new Track();
//     // await track.add('sample.txt');
//     // await track.commit('fifth commit');
//     // await track.log();
//     await track.showCommitDiff('99e540048c5936d615810bc57acb6fe6e144de00');
// })();

program.command('init').action(async () => {
    const track = new Track();
});

program.command('add <file>').action(async (file) => {
    const track = new Track();
    await track.add(file);
});

program.command('commit <message>').action(async (message) => {
    const track = new Track();
    await track.commit(message);
});

program.command('log').action(async () => {
    const track = new Track();
    await track.log();
});

program.command('show <commitHash>').action(async (commitHash) => {
    const track = new Track();
    await track.showCommitDiff(commitHash);
});

program.parse(process.argv);


