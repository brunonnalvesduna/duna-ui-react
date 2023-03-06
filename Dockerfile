FROM node

# RUN apt-get update && apt-get upgrade -y && \
# apt-get install -y wget xz-utils python3

# WORKDIR /node
#     RUN wget https://nodejs.org/dist/v16.17.0/node-v16.17.0-linux-x64.tar.xz
#     RUN tar -xvf node-v16.17.0-linux-x64.tar.xz

# ENV PATH=${PATH}:/node/node-v16.17.0-linux-x64/bin
# SHELL ["/bin/bash"]
WORKDIR /app

COPY . .

RUN npm install

# This compilation should catch typescript errors
RUN /usr/local/bin/npm run build

ENTRYPOINT [ "/app/entrypoint.sh" ]


# EXPOSE 9090
EXPOSE 3000