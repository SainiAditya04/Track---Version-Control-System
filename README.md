# Track - a simple version control system
Hey there, I developed a basic version control system, "Track," inspired by Git. 
This system allows users to initialize repositories, add files, commit changes, and view file differences between commits.
## Key features:
**Initialization** (`track init`): Sets up a new .track repository in the current directory, including necessary subdirectories and files for storing object data, commit history, and staging area.

**File Addition** (`track add <file_name>`): Reads and hashes the content of the specified file, stores the file content as an object, and updates the staging area.

**Commit Changes** (`track commit <message>`): Captures the current state of the staging area, creates a new commit object with a unique hash, and updates the HEAD to point to the latest commit.

**View Commit History** (`track log`): Displays a log of all commits, showing commit hashes, timestamps, and messages.

**Show Differences** (`track show <commitHash>`): Displays the differences in file content between the specified commit and its parent commit using the color-coded output for added and removed lines.
