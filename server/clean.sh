 #!/bin/bash
shopt -s extglob
rm -rf /mnt/pages/prw/*

git -C /mnt/pages sync