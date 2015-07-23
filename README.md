Taque-o-pariu
====

O taque-o-pariu é um serviço de teste de integração para com nossos clientes, através dele você pode acompanhar quando uma API para de funcionar. Esse projeto é mara.

![](taqueopariu.png) 

## Only 4 geeks mothafucka!

### Instalação

    $ npm install

### Utilização

	 $ node index.js [-c tests.json]
	
	  -c, --configuration=ARG  Suite de testes
	  -n, --threads=ARG        Quantidade de threads por grupo
	  -t, --timeout=ARG        Timeout da requisição
	  -l, --loglevel=ARG       trace, debug, warn, error
	  -h, --help               Exibe alguma ajuda
	  -i, --interval           Intervalo entre os testes
	  -d, --database=ARG       URL de acesso do mongo
	

### Como fica na suíte teste

	{
		"belagricola" : {
			"SNCR" : {
				"description" : "Consulta do TRT01 para a OAB",
				"url" : "https://irql.bipbop.com.br/?q=SELECT%20FROM%20ZUERA,
				"xpath" : [
					"//classificacaoFundiaria/text()='Grande Propriedade Produtiva'",
					"boolean(//execution-time)"
				]
			}
		}
	}

### Como fica no Mongo


	{
		"_id" : ObjectId("55933b37ad9ccee016e99d0c"),
		"group" : "belagricola",
		"name" : "SNCR",
		"success" : true,
		"responseTime" : 35,
		"date" : ISODate("2015-07-01T00:58:31.612Z"),
		"__v" : 0
	}


### Instalação Teta de Nega
    
    $ pip install requeriments.txt

### Utilização

    ********************************************
    *** FUI FEITO COM AMOR PARA TAQUEOPARIU ***
    ********************************************


    usage: teta_de_nega.py [-h] [--version] [--filein FILEIN] [--getUrl GETURL]
                           [--filecon FILECON] [--fileout FILEOUT] [--debug DEBUG]

    optional arguments:
      -h, --help            show this help message and exit
      --version             show program's version number and exit
      --filein FILEIN, -filein FILEIN
                            Text file consultations.
      --getUrl GETURL, -getUrl GETURL
                            Get url with Tribunal: Ex. --getUrl TJMG
      --filecon FILECON, -filecon FILECON
                            File concatenation with another json file.
      --fileout FILEOUT, -fileout FILEOUT
                            Json file out.
      --debug DEBUG, -d DEBUG
                            Debug

### Exemplos
    # Gerando o arquivo de configuração json apartir do txt com as consultas.
    $ python teta_de_nega.py --filein consulta.txt --fileout configuration.json
    
    # Concatenando um arquivo de configuração "json" antigo com um novo.
    $ python teta_de_nega.py --filein consulta.txt --filecon arquivo_antigo.json --fileout configuration.json
    
    # Testando os tribunais que estão desconectados segundo taqueopariu.
    $ python teta_de_nega.py --filein consulta.txt --getUrl PJETRT2
