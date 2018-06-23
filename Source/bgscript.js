chrome.tabs.onUpdated.addListener(ListenerHandler);

Loop();

function ListenerHandler(tabId, changeInfo, tab) 
{
	if (changeInfo.status == "complete")
	{
		if (tab.url.includes('oauth.vk.com') && tab.url.includes('access_token'))
		{
			chrome.storage.local.get('access_token', function (result)
			{
				if (result.access_token === undefined)
				{
					chrome.tabs.remove(tabId);
					GetAccessToken(tab.url);
				}
			});
		}
	}
}

function GetAccessToken(url)
{
	var accessToken = GetUrlParameterValue(url, 'access_token');
	if (accessToken === undefined || accessToken.length === undefined) 
	{
		alert('Не удалось получить токен');
		return;
	}

	var userId = GetUrlParameterValue(url, 'user_id');
	if (userId === undefined || userId.length === undefined) 
	{
		alert('Не удалось получить userId');
		return;
	}

	chrome.storage.local.set({'access_token': accessToken, "userId" : userId}, function ()
	{
		chrome.tabs.create({url:"group_loading_page.html"}, function(tab)
		{
			LoadGroups(tab.id, userId, accessToken);
		});
	});
}

function LoadGroups(tabId, userId, accessToken)
{
	var xhr = new XMLHttpRequest();

   	url = "https://api.vk.com/method/groups.get?user_id=" + userId + "&filter=admin,editor,moder&extended=1&access_token=" + accessToken + "&v=5.78";

	xhr.open('GET', url, true);

	xhr.send();

	xhr.onreadystatechange = function() 
	{
		if (xhr.readyState != 4) 
		{
			return;
		}
		if (xhr.status != 200) 
		{
			alert("Не удалось получить список гупп.\nСтатус: " + xhr.status + '\nТекст: ' + xhr.statusText + "\nПроверьте интерен соединение и доступ к сайту Вконтакте и попробуйте еще раз.");
		} 
		else
		{
			chrome.storage.local.set({'group_list': xhr.responseText}, function ()
			{
				chrome.tabs.remove(tabId);
				chrome.tabs.create({url:"page_after_group_loading.html"});
			});
		}
	}
}

function GetUrlParameterValue(url, parameterName) {
	"use strict";

	var urlParameters  = url.substr(url.indexOf("#") + 1),
		parameterValue = "",
		index,
		temp;

	urlParameters = urlParameters.split("&");

	for (index = 0; index < urlParameters.length; index += 1) {
		temp = urlParameters[index].split("=");

		if (temp[0] === parameterName) {
			return temp[1];
		}
	}

	return parameterValue;
}


function Scedule(timeout)
{
	setTimeout(Loop, timeout);
}

function Loop()
{
	chrome.storage.local.get(['access_token', 'group_numeric_id', 'comments'], function(result) 
	{
		if (result.access_token === undefined || result.group_numeric_id === undefined)
		{
			Scedule(1000);
			return;
		}
		oldData = result.comments;
		GetWallDataWithOffset(0, 0, oldData, undefined, undefined, result.group_numeric_id, result.access_token,
			function(newComments, newData, totalComments, totalPosts)
			{
				chrome.storage.local.get(['new_comments'], function(result) 
				{
					var oldNewComments = result.new_comments;
					if (oldNewComments === undefined)
					{
						oldNewComments = {};
					}
					else
					{
						for(var key in newComments)
						{
							var item = newComments[key];
							alert("Новые комментарии в Вашей группе!\n"+
								"Количество: "+ item.count + "\nПост: " + item.text);
							if (oldNewComments[item.id] === undefined)
							{
								oldNewComments[item.id] = {};
								oldNewComments[item.id].id = item.id;
								oldNewComments[item.id].count = 0;
							}
							oldNewComments[item.id].text = item.text;
							oldNewComments[item.id].count += item.count;
						}
					}
					chrome.storage.local.set({'new_comments': oldNewComments, 
						'comments' : newData, 
						'total_comments' : totalComments,
						'total_posts': totalPosts}, function ()
					{
						Scedule(30000);
					});
				});
			});
	});
}

function GetWallDataWithOffset(offset, totalComments, oldData, newData, newComments, groupId, accessToken, callback)
{
	if (newData === undefined)
	{
		newData = {};
	}
	if (newComments === undefined)
	{
		newComments = {};
	}
	var batchCount = 100;
	var xhr = new XMLHttpRequest();
	url = "https://api.vk.com/method/wall.get?owner_id=-" + groupId + "&count="+batchCount+"&offset=" + offset + "&extended=0&access_token=" + accessToken + "&v=5.78";
	xhr.open('GET', url, true);
	xhr.send();

	xhr.onreadystatechange = function() 
	{
		if (xhr.readyState != 4) 
		{
			return;
		}
		if (xhr.status != 200) 
		{
//			alert(xhr.status + ': ' + xhr.statusText);
			Scedule(30000);
			return;
		}
		else
		{
			try 
			{
				var response = JSON.parse(xhr.responseText)["response"];
				var posts = response && response["items"];
				var postsCount = response && response["count"];

				if (response === undefined || posts === undefined || postsCount === undefined)
				{
					Scedule();
					return;
				}
				posts.forEach(function(item, i, arr) 
				{
					var count = item.comments.count;
					if (count > 0)
					{
						var oldCount = 0
						if (oldData != undefined && oldData[item.id] != undefined)
						{
							oldCount = oldData[item.id];
						}
						if (oldCount < count)
						{
							newComments[item.id] = {};
							newComments[item.id].id = item.id;
							var text = item.text;
							if (text.length > 100)
							{
								text = text.substr(0,100) + "...";
							}
							newComments[item.id].text = text;
							newComments[item.id].count = count - oldCount;
						}
						newData[item.id] = count;
						totalComments += count;
					}
				});
				var restPosts = postsCount - posts.length - offset;
				console.log('Posts recieved: ' + posts.length + '; Total Count: ' + postsCount + '; Rest: ' + restPosts);

				if (restPosts > 0)
				{
					GetWallDataWithOffset(offset + batchCount, totalComments, oldData, newData, newComments, groupId, accessToken, callback);
				}
				else
				{
					callback(newComments, newData, totalComments, postsCount);
				}
			} 
			catch(e)
			{
				alert('Ошибка ' + e.name + ":" + e.message + "\n" + e.stack);
				Scedule(30000);
			}
		}
	}
}