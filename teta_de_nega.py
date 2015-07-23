#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import io
import json
import re
import argparse
import logging
import requests

from urllib import quote_plus

logger = None


TIMEOUT = 300  # 5 min

param = {}
param['url'] = "https://irql.bipbop.com.br/"
param['q'] = "SELECT FROM 'JURISTEK'.'VALIDATE'"
param['data'] = "SELECT FROM 'INFO'.'INFO'"
param['apiKey'] = "4d8e665cd3a54918defb0ec758af329a"


class InvalidSyntaxFile(Exception):
    """Exception invalid file."""

    def __init__(self, msg):
        self.msg = msg


def set_debug(debug):
    """ set debug """

    global logger

    logger = logging.getLogger('teta-de-nega')
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
                    '%(asctime)s %(name)-12s %(levelname)-8s %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    if debug:
        logger.setLevel(logging.DEBUG)
    else:
        logging.basicConfig(level=logging.INFO)


def generate_url(line):
    """ format url """

    url_final = "{url}?q={q}&data={data}&apiKey={apiKey}"
    return url_final.format(url=param['url'],
                            q=quote_plus(param['q']),
                            data=quote_plus(line.strip()),
                            apiKey=param['apiKey']
                            )


def findSigla(line):
    """ find sigla """

    sigla = re.findall(r"'SIGLA'\s=\s'(.*?)'", line)
    if sigla:
        return sigla[0]
    else:
        return None


def generate_description(line, sigla):
    """ generate description for output """

    setence_descr = u"Consulta do {sigla} por {type}."

    if 'PROCESSO' in line:
        return setence_descr.format(
                                    sigla=sigla,
                                    type=u'número de processo'
                                    )
    elif 'OAB' in line:
        return setence_descr.format(
                                    sigla=sigla,
                                    type='oab'
                                    )
    else:
        raise InvalidSyntaxFile("SyntaxError: %s" % line)


def struct_out(text):
    """ struct out json """

    out_json = {}
    out_json['projuris'] = {}

    if text:
        logger.info("*** Stuct output. ***")
        for line in text:
            try:
                content = {}
                sigla = findSigla(line)
                content[sigla] = {}

                content[sigla]['description'] = generate_description(line,
                                                                     sigla)
                content[sigla]['url'] = generate_url(line)

                xpaths = content[sigla]['xpath'] = []
                xpaths.append("boolean(//processo)")

                out_json['projuris'].update(content)

            except InvalidFile as e:
                logger.error(e.msg)
                pass

    return out_json


def openf(file_string):
    """ open file """

    data = None

    if os.path.exists(file_string):
        with io.open(file_string, 'rb') as f:
            data = f.readlines()
            logger.info('*** Opening file ... ***')
    else:
        logger.error("%s not exist." % file_string)

    return data


def savef(file_out, content):
    """ save file json """

    with io.open(file_out, 'w', encoding='utf8') as outfile:
        outfile.write(json.dumps(content, ensure_ascii=False,
                      sort_keys=True,
                      indent=4)
                      )


def concatane_file(file_consulta, file_in, file_out):
    """ concatenation file """

    data = None

    data_json = struct_out(openf(file_consulta))

    with io.open(file_in, 'r', encoding='utf8') as outfile:
        data = json.load(outfile)

    if data and data_json:
        for keys in data.keys():
            data_json[keys] = data[keys]

        savef(file_out, data_json)
        logger.info("*** Concatenation %s success. ***" % file_in)


def getUrl(file_in, sigla, timeout=TIMEOUT):
    """ getUrl for tribunal """

    lines = openf(file_in)
    if lines:
        for line in lines:
            get_tribunal = findSigla(line)
            if not get_tribunal:
                return None
            if get_tribunal == sigla:
                url = generate_url(line)
                try:
                    logger.info("Connecting: %s" % sigla)
                    requests.get(url, timeout=timeout)
                    logger.info("Connected... %s" % sigla)

                except requests.exceptions.Timeout:
                    logger.error(u"[Error]: Xiiii %s ta fora mermão..."
                                 % url)


def main(sigla, file_in, file_con, file_out, debug):
    """ main """

    set_debug(debug)

    if file_con:
        concatane_file(file_in, file_con, file_out)
    elif sigla:
        print getUrl(file_in, sigla)
    else:
        data_json = struct_out(openf(file_in))
        savef(file_out, data_json)
        logger.info("*** Json file created success. ***")


if __name__ == '__main__':
    print "\n"
    print "*" * 44
    print "*** FUI FEITO COM AMOR PARA TAQUEOPARIU ***"
    print "*" * 44
    print "\n"

    parser = argparse.ArgumentParser()

    parser.add_argument('--version', action='version', version='%(prog)s 0.1')
    parser.add_argument('--filein', '-filein', dest='filein',
                        help='Text file consultations.',
                        default='consulta.txt')
    parser.add_argument('--getUrl', '-getUrl', dest='geturl',
                        default=False,
                        help='Get url with Tribunal: Ex. --getUrl TJMG')
    parser.add_argument('--filecon', '-filecon', dest='filecon',
                        default=None,
                        help='File concatenation with another json file.')
    parser.add_argument('--fileout', '-fileout', dest='fileout',
                        help='Json file out.',
                        default='configuration.json')
    parser.add_argument('--debug', '-d', dest='debug', default=False,
                        help="Debug")

    args = parser.parse_args()

    main(args.geturl, args.filein, args.filecon,
         args.fileout, args.debug)
